/**
 * Build the `sources update` Task.
 *
 * Two modes, chosen by `runtime.mutation.preview`:
 *
 * - Preview (CLI `--dry-run`, or MCP without `confirm`): NETWORK-FREE. It reads
 *   only the config, then hands back a plan-only Task listing the refs it would
 *   resolve+build and the pointer it would write — no git fetch, no compile, no
 *   cache write. This is what a dry-run / agent "preview" must be: side-effect
 *   free and offline-safe.
 * - Real execution: the heavy work — resolve every configured pack (git
 *   clone/fetch, file verify, npm resolve), then build the ONE combined
 *   content-addressed pack — runs eagerly (it is not expressible as a task
 *   effect: the effect set is fs + exec, and the in-process compile is not an
 *   effect at all). The returned Task models the mutations: the active-pack
 *   pointer write (undo restores or removes the prior pointer) and the package
 *   skill symlinks.
 *
 * Pinning a revision is the ref's job, not a flag's: put a SHA in the source
 * (`git+https://…#<sha>`) and every update resolves to exactly that commit.
 */

import {
  $,
  deleteFile,
  gen,
  info,
  mkdir,
  symlink,
  type Task,
  writeFile,
} from "@canonical/task";
import { VERSION } from "../../constants.js";
import { PragmaError } from "../../kernel/error/PragmaError.js";
import { cliRecovery } from "../../kernel/error/recovery.js";
import { buildPack } from "../../kernel/runtime/graphpack/build.js";
import { activePackPath, readActivePack } from "../../kernel/runtime/paths.js";
import type { PackageRef } from "../../kernel/runtime/refs/parseRef.js";
import {
  parsePackDeclaration,
  redactUrl,
} from "../../kernel/runtime/refs/parseRef.js";
import {
  detectPrefixClashes,
  harvestPrefixes,
  type ResolvedPackage,
  resolvePackage,
} from "../../kernel/runtime/refs/resolve.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import { installedSkillsDir } from "../../kernel/skills/discover.js";
import { planSkillInstall } from "./installSkills.js";
import type { SourcesUpdateData } from "./types.js";

/** Generic-core prefixes; config `prefixes` merge over them (config wins). */
const CORE_PREFIXES: Readonly<Record<string, string>> = {
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  owl: "http://www.w3.org/2002/07/owl#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  skos: "http://www.w3.org/2004/02/skos/core#",
  sh: "http://www.w3.org/ns/shacl#",
  dcterms: "http://purl.org/dc/terms/",
};

/**
 * The prefix map a pack is built with: core < the packs' own `@prefix` < config.
 *
 * A resolved package's own declarations are harvested from its TTL (ke does not
 * fold parsed-Turtle prefixes into `store.prefixes`) and merged beneath config
 * so the index compacts pack URIs to `pfx:Local` — the FROZEN `{name,type}`
 * token contract — while config still wins any clash. The merged map is
 * persisted in the manifest, so boot reads the same names.
 *
 * Exported because the bundler (`scripts/bundle.ts`) compiles the embedded pack
 * through this exact precedence. If the two pipelines computed prefixes
 * separately, the embed could compact entities differently from what the SAME
 * config produces on a user's machine — a silent divergence in entity names.
 *
 * @param inputs - The resolved packages' labelled RDF sources.
 * @param configPrefixes - The config layer's `prefixes`, if any.
 * @returns The merged prefix map to build with.
 */
export function buildPackPrefixes(
  inputs: readonly { readonly content: string }[],
  configPrefixes: Readonly<Record<string, string>> | undefined,
): Record<string, string> {
  return {
    ...CORE_PREFIXES,
    ...harvestPrefixes(inputs),
    ...(configPrefixes ?? {}),
  };
}

/**
 * Build the NETWORK-FREE preview plan for `sources update`.
 *
 * A plan-only Task: it reads the config to list the refs a real update would
 * resolve and build, then models the project mutation (the active-pack pointer
 * write) as effects the PLAN interpreter can describe WITHOUT running them.
 * No git, no compile, no cache write — so `--dry-run` and an MCP plan-first call
 * are offline-safe. Config refs are parsed (a cheap, offline validity check) but
 * never resolved.
 *
 * @param runtime - The per-invocation runtime.
 * @returns A plan-only Task describing the intended effects.
 */
async function buildUpdatePlan(
  runtime: PragmaRuntime,
): Promise<Task<SourcesUpdateData>> {
  const layers = await runtime.loadConfig();
  const entries = layers.config.packs ?? [];
  const refs = entries.map(parsePackDeclaration);

  const data: SourcesUpdateData = {
    contentHash: "",
    reused: false,
    packs: refs.map((ref) => ({
      name: ref.pkg,
      resolved: "",
      sourceCount: 0,
      storyCount: 0,
    })),
  };

  return gen(function* () {
    yield* $(
      info(
        refs.length > 0
          ? `Resolve and build ${refs.length} pack(s): ${refs.map((ref) => ref.source).join(", ")}`
          : "No packs configured — the embedded pack answers store reads",
      ),
    );
    // The project mutation, previewed (dry-run never executes it). The content
    // is a placeholder: the real hash only exists once the build has run.
    yield* $(
      writeFile(activePackPath(runtime.cwd), "(the pack hash, on execute)"),
    );
    return data;
  });
}

/**
 * Resolve, build, and produce the pointer-writing Task — or, for a preview, the
 * network-free plan.
 *
 * @param runtime - The per-invocation runtime.
 * @param skipInvalid - Drop sources that fail to parse (warning about each)
 *   rather than failing the whole update.
 * @returns A Task that points the project at the built pack and returns the
 *   update result.
 * @note Impure — resolves packages (may hit git) and builds the pack eagerly,
 *   UNLESS `runtime.mutation.preview` is set, in which case it stays offline.
 */
export async function buildUpdateTask(
  runtime: PragmaRuntime,
  skipInvalid = false,
): Promise<Task<SourcesUpdateData>> {
  if (runtime.mutation?.preview) return buildUpdatePlan(runtime);

  // Progress seam (U7/U11): stream stage lines while the heavy EAGER work — the
  // clone/parse/build below — runs, so the long op is never silent. Unset over
  // MCP (a no-op there); `--verbose` adds a line per source (U11).
  const report = runtime.report;
  const verbose = runtime.globalFlags.verbose;

  const layers = await runtime.loadConfig();
  const entries = layers.config.packs ?? [];
  const priorHash = readActivePack(runtime.cwd);

  const resolved: (ResolvedPackage & { readonly kind: PackageRef["kind"] })[] =
    [];
  for (const entry of entries) {
    const ref = parsePackDeclaration(entry);
    report?.(resolveProgress(ref));
    resolved.push({
      kind: ref.kind,
      ...(await resolvePackage(ref, { cwd: runtime.cwd })),
    });
  }

  const inputs = resolved.flatMap((pkg) => pkg.sources);
  // The packages' own `stories/*.json`, carried into the pack verbatim (see
  // graphpack/types.STORIES_FILE). Raw text: nothing interprets them here.
  const stories = resolved.flatMap((pkg) => pkg.stories);

  // Refuse to build an empty store (A4). A package that ships no `.ttl` (or no
  // configured packs at all) would build a 0-triple pack whose empty
  // `data.nq` fails the completeness gate — so the "successful" update boots to
  // a PERMANENT `STORE_UNAVAILABLE` loop. Fail loudly here, leaving the embedded
  // pack (or the prior build) answering reads, instead of pointing at that one.
  if (inputs.length === 0) {
    throw PragmaError.configError(
      entries.length === 0
        ? "No packs are configured, so there are no sources to build a store from. The embedded pack answers reads until you add a pack."
        : `The ${entries.length} configured pack(s) resolved 0 RDF sources (no definitions/**.ttl or data/**.ttl). Refusing to build an empty store.`,
      {
        recovery: cliRecovery(
          "sources update --verbose",
          "Add a pack that ships `.ttl` under definitions/ or data/, then re-run.",
        ),
      },
    );
  }

  const prefixes = buildPackPrefixes(inputs, layers.config.prefixes);

  // Warn on conflicting `@prefix` declarations across packages (A5): last-wins
  // is silent otherwise, compacting the losing package's URIs to the wrong
  // prefix. Display-only, so a warning (not a hard failure) is the right call.
  for (const clash of detectPrefixClashes(inputs)) {
    report?.(
      `Prefix "${clash.label}:" is declared with conflicting IRIs across packages (${clash.iris.join(" vs ")}); last wins, so some entities may compact to the wrong prefix.`,
    );
  }

  report?.(`Building store from ${inputs.length} source(s)`);
  if (verbose) for (const input of inputs) report?.(`  parse ${input.path}`);
  if (stories.length > 0)
    report?.(`Carrying ${stories.length} package read story file(s)`);

  // Build the pack. On a parse/build failure, classify it as a NAMED data error
  // (U6) — not INTERNAL_ERROR's "please report this issue" — identifying the
  // offending package source, since ke's parser error carries only line/column.
  // With `--skip-invalid`, drop the unparseable sources (warning LOUDLY about
  // each — never a silent partial graph) and build from the rest instead of
  // failing the whole update.
  // `<name>@<kind>:<resolved>` — the SAME provenance label the bundler writes
  // for the embed, so the manifest field means one thing whoever built the pack,
  // and `sources status` / `doctor` can still answer "which revision is my store
  // built from?" now that no lock records it. A `file:` pack resolves to a local
  // PATH rather than a revision, so it contributes its name alone: a machine
  // path is not provenance, and `sources status` already lists the ref.
  const sourceRef =
    resolved
      .map((pkg) =>
        pkg.kind === "file"
          ? pkg.name
          : `${pkg.name}@${pkg.kind}:${pkg.resolved}`,
      )
      .join(", ") || "embedded";
  let built: Awaited<ReturnType<typeof buildPack>>;
  try {
    built = await buildPack(inputs, {
      name: "pragma",
      version: VERSION,
      sourceRef,
      prefixes,
      stories,
    });
  } catch (error) {
    if (!skipInvalid) throw await classifySourceBuildError(error, inputs);
    const bad = await collectBadSources(inputs);
    // A build failure not attributable to a single unparseable source (e.g. a
    // cross-file conflict) can't be skipped away — surface the named error.
    if (bad.length === 0) throw await classifySourceBuildError(error, inputs);
    const badPaths = new Set(bad.map((entry) => entry.path));
    const usableInputs = inputs.filter((input) => !badPaths.has(input.path));
    for (const entry of bad)
      report?.(`  skipped invalid source ${entry.path}: ${entry.message}`);
    report?.(
      `Skipped ${bad.length} invalid source(s); building from ${usableInputs.length} of ${inputs.length}`,
    );
    if (usableInputs.length === 0)
      throw PragmaError.configError(
        `All ${inputs.length} configured source(s) failed to parse — nothing to build.`,
        {
          recovery: cliRecovery(
            "sources update --verbose",
            "Fix the reported sources, then re-run.",
          ),
        },
      );
    try {
      built = await buildPack(usableInputs, {
        name: "pragma",
        version: VERSION,
        sourceRef,
        // Re-harvest prefixes from only the sources that survived, so a dropped
        // file's declarations don't skew compaction.
        prefixes: buildPackPrefixes(usableInputs, layers.config.prefixes),
        stories,
      });
    } catch (rebuildError) {
      throw await classifySourceBuildError(rebuildError, usableInputs);
    }
  }
  report?.(
    `${built.reused ? "Reused" : "Built"} store ${built.contentHash.slice(0, 12)}`,
  );

  // Refuse a 0-triple build (A4): non-empty sources can still parse to no
  // triples (e.g. comment-only TTL, or a file of only `@prefix` lines). Pointing
  // the project at an empty pack boots to the same `STORE_UNAVAILABLE` loop, so
  // treat it as a data error rather than a silent "success". (A manifest
  // predating the triple count is left alone — `undefined` never trips this.)
  if (built.manifest.tripleCount === 0) {
    throw PragmaError.configError(
      `The configured sources parsed to 0 RDF triples, so the store would be empty. Refusing to build an empty store.`,
      {
        recovery: cliRecovery(
          "sources update --verbose",
          "Check that the package sources actually contain RDF triples, then re-run.",
        ),
      },
    );
  }

  const path = activePackPath(runtime.cwd);
  const data: SourcesUpdateData = {
    contentHash: built.contentHash,
    reused: built.reused,
    packs: resolved.map((pkg) => ({
      name: pkg.name,
      resolved: pkg.resolved,
      sourceCount: pkg.sources.length,
      storyCount: pkg.stories.length,
    })),
  };

  const undo =
    priorHash !== undefined ? writeFile(path, priorHash) : deleteFile(path);

  // Install package-provided skills (U10): symlink each resolved package's
  // `skills/*` into the installed-skills root, so `skill list` / `setup skills`
  // see them after an update. Kept in this Task (reversible: created links carry
  // an unlink undo) so `sources update --undo` also removes them.
  const skillLinks = planSkillInstall(resolved).filter(
    (link) => link.action !== "skipped",
  );
  if (skillLinks.length > 0)
    report?.(`Installing ${skillLinks.length} skill(s)`);

  report?.(`Pointing ${runtime.cwd} at pack ${built.contentHash.slice(0, 12)}`);
  return gen(function* () {
    yield* $(writeFile(path, built.contentHash, { undo }));
    if (skillLinks.length > 0) {
      yield* $(mkdir(installedSkillsDir(), true));
      for (const link of skillLinks) {
        if (link.action === "replaced") yield* $(deleteFile(link.linkPath));
        yield* $(
          symlink(link.target, link.linkPath, {
            undo: deleteFile(link.linkPath),
          }),
        );
      }
    }
    return data;
  });
}

/** Progress line for a package about to be resolved, phrased by ref kind. */
function resolveProgress(ref: PackageRef): string {
  switch (ref.kind) {
    case "git":
      return `Cloning ${ref.pkg} from ${redactUrl(ref.url)}`;
    case "file":
      return `Reading ${ref.pkg} from ${ref.path}`;
    case "npm":
      return `Resolving ${ref.pkg}`;
  }
}

/**
 * Classify a pack-build failure as a NAMED data error (U6).
 *
 * ke/Oxigraph parses each source's Turtle, but its thrown parser error carries
 * only the line/column — NOT which source produced it (it sees a content string,
 * not a path). So on failure we re-parse each source in ISOLATION to find the
 * first that throws — the culprit — and raise a `CONFIG_ERROR` naming its
 * `pkg/relative-path` with the parser's own message and an actionable recovery.
 * This runs only on the error path, so the per-source re-parse cost is paid once.
 * A `PragmaError` from resolution (e.g. a missing file) is already classified and
 * passes through untouched.
 *
 * @param error - The value thrown by `buildPack`.
 * @param inputs - The labelled sources handed to the build.
 * @returns A classified {@link PragmaError} (never INTERNAL_ERROR for bad data).
 */
async function classifySourceBuildError(
  error: unknown,
  inputs: readonly { readonly path: string; readonly content: string }[],
): Promise<PragmaError> {
  if (error instanceof PragmaError) return error;
  const parserMessage = error instanceof Error ? error.message : String(error);
  const culprit = (await collectBadSources(inputs)).at(0);
  const detail = culprit?.message ?? parserMessage;
  const where = culprit
    ? `Package source "${culprit.path}" could not be parsed`
    : "The configured package sources could not be built into a store";
  return PragmaError.configError(`${where}: ${detail}`, {
    recovery: cliRecovery(
      "sources update --verbose",
      "Re-run with --verbose to see each file as it parses. If a package ships malformed RDF, report it to that package's maintainer.",
    ),
  });
}

/**
 * Re-parse each source in isolation and collect EVERY one that fails to parse.
 *
 * TWO CALLERS, ONE FUNCTION. `--skip-invalid` needs the full set to drop before
 * rebuilding; `classifySourceBuildError` needs only the first, for the message,
 * and takes `.at(0)`. There used to be a second function for that — the same
 * loop, the same throwaway store, differing only in returning at the first
 * failure instead of accumulating — so `collectBadSources(x).at(0)` WAS
 * `isolateBadSource(x)` and the two could drift in what counts as unparseable.
 *
 * The short-circuit is what that duplicate bought, and giving it up is
 * deliberate: this is the error path of a build that has ALREADY failed once,
 * and `--skip-invalid` walks every source here anyway. The worst case is one
 * throwaway store per configured source instead of one, on a path that only
 * runs to explain a failure.
 *
 * @param inputs - The labelled sources.
 * @returns Every source that fails to parse alone, with its parser message.
 */
async function collectBadSources(
  inputs: readonly { readonly path: string; readonly content: string }[],
): Promise<{ path: string; message: string }[]> {
  const { createStore } = await import("@canonical/ke");
  const bad: { path: string; message: string }[] = [];
  for (const input of inputs) {
    try {
      const store = await createStore({
        sources: [{ content: input.content, path: input.path }],
      });
      store.dispose();
    } catch (error) {
      bad.push({
        path: input.path,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return bad;
}
