/**
 * Build the `sources update` Task.
 *
 * Two modes, chosen by `runtime.mutation.preview`:
 *
 * - Preview (CLI `--dry-run`, or MCP without `confirm`): NETWORK-FREE. It reads
 *   only the config, then hands back a plan-only Task listing the refs it would
 *   resolve+build and the lock it would write — no git fetch, no compile, no
 *   cache write. This is what a dry-run / agent "preview" must be: side-effect
 *   free and offline-safe.
 * - Real execution: the heavy work — resolve every configured package (git
 *   clone/fetch, file verify, npm resolve), then build the ONE combined
 *   content-addressed pack — runs eagerly (it is not expressible as a task
 *   effect: the effect set is fs + exec, and the in-process compile is not an
 *   effect at all). The returned Task models the one project mutation, the
 *   `pragma.lock.json` write, with an undo that restores (or removes) the prior
 *   lock. Under `--frozen` each package re-resolves to the lock's pinned
 *   revision and keeps its `resolvedAt`, so an unchanged update rewrites a
 *   byte-identical lock.
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
import { RECOVERY_CLI_PREFIX, VERSION } from "../../constants.js";
import type { PackageEntry } from "../../kernel/config/types.js";
import { PragmaError } from "../../kernel/error/PragmaError.js";
import { cliRecovery } from "../../kernel/error/recovery.js";
import { buildPack } from "../../kernel/runtime/graphpack/build.js";
import {
  type PragmaLock,
  readLock,
  serializeLock,
} from "../../kernel/runtime/lock.js";
import { LOCK_BASENAME, lockPath } from "../../kernel/runtime/paths.js";
import type { PackageRef } from "../../kernel/runtime/refs/parseRef.js";
import {
  parsePackageEntry,
  redactUrl,
} from "../../kernel/runtime/refs/parseRef.js";
import {
  harvestPrefixes,
  type ResolvedPackage,
  resolvePackage,
} from "../../kernel/runtime/refs/resolve.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import { installedSkillsDir } from "../skill/discover.js";
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

const entryName = (entry: PackageEntry): string =>
  typeof entry === "string" ? entry : entry.name;

/**
 * Build the NETWORK-FREE preview plan for `sources update`.
 *
 * A plan-only Task: it reads the config to list the refs a real update would
 * resolve and build, then models the single project mutation (the lock write)
 * as effects the dry-run interpreter can describe WITHOUT running them. No git,
 * no compile, no cache write — so `--dry-run` and an MCP plan-first call are
 * offline-safe. Config refs are parsed (a cheap, offline validity check) but
 * never resolved.
 *
 * @param runtime - The per-invocation runtime.
 * @returns A plan-only Task describing the intended effects.
 */
async function buildUpdatePlan(
  runtime: PragmaRuntime,
): Promise<Task<SourcesUpdateData>> {
  const layers = await runtime.loadConfig();
  const entries = layers.config.packages ?? [];
  const refs = entries.map(parsePackageEntry);
  const path = lockPath(runtime.cwd);

  const data: SourcesUpdateData = {
    contentHash: "",
    reused: false,
    lockPath: path,
    packs: refs.map((ref) => ({ name: ref.pkg, resolved: "", sourceCount: 0 })),
  };
  // A representative (never-written) lock, so the previewed write shows a
  // plausible shape/size. Placeholders make clear nothing was resolved.
  const previewLock: PragmaLock = {
    version: 1,
    contentHash: "(resolved on execute)",
    packs: refs.map((ref) => ({
      name: ref.pkg,
      source: ref.source,
      resolved: "(resolved on execute)",
      resolvedAt: "(resolved on execute)",
    })),
  };
  const previewContent = serializeLock(previewLock);

  return gen(function* () {
    yield* $(
      info(
        refs.length > 0
          ? `Resolve and build ${refs.length} package(s): ${refs.map((ref) => ref.source).join(", ")}`
          : "No packages configured — the embedded pack answers store reads",
      ),
    );
    // The one project mutation, previewed (dry-run never executes it).
    yield* $(writeFile(path, previewContent));
    return data;
  });
}

/**
 * Resolve, build, and produce the lock-writing Task — or, for a preview, the
 * network-free plan.
 *
 * @param runtime - The per-invocation runtime.
 * @param frozen - When true, re-resolve to the lock's pinned revisions only.
 * @returns A Task that writes `pragma.lock.json` and returns the update result.
 * @note Impure — resolves packages (may hit git) and builds the pack eagerly,
 *   UNLESS `runtime.mutation.preview` is set, in which case it stays offline.
 */
export async function buildUpdateTask(
  runtime: PragmaRuntime,
  frozen: boolean,
): Promise<Task<SourcesUpdateData>> {
  if (runtime.mutation?.preview) return buildUpdatePlan(runtime);

  // Progress seam (U7/U11): stream stage lines while the heavy EAGER work — the
  // clone/parse/build below — runs, so the long op is never silent. Unset over
  // MCP (a no-op there); `--verbose` adds a line per source (U11).
  const report = runtime.report;
  const verbose = runtime.globalFlags.verbose;

  const layers = await runtime.loadConfig();
  const entries = layers.config.packages ?? [];
  const existing = readLock(runtime.cwd);
  const priorContent = existing ? serializeLock(existing) : undefined;

  const resolved: ResolvedPackage[] = [];
  for (const entry of entries) {
    const ref = parsePackageEntry(entry);
    report?.(resolveProgress(ref));
    const pinned = existing?.packs.find((pack) => pack.name === ref.pkg);
    resolved.push(
      await resolvePackage(ref, {
        cwd: runtime.cwd,
        frozen,
        pinned: pinned?.resolved,
      }),
    );
  }

  // Prefix precedence: core < pack < config. A resolved package's own
  // `@prefix` declarations are harvested from its TTL and merged beneath config
  // so the index compacts pack URIs to `pfx:Local` (the FROZEN {name,type}
  // token contract); config still wins any clash. The merged map is persisted
  // in the manifest, so boot reads the same names.
  const inputs = resolved.flatMap((pkg) => pkg.sources);
  const prefixes = {
    ...CORE_PREFIXES,
    ...harvestPrefixes(inputs),
    ...(layers.config.prefixes ?? {}),
  };
  report?.(`Building store from ${inputs.length} source(s)`);
  if (verbose) for (const input of inputs) report?.(`  parse ${input.path}`);

  // Build the pack. On a parse/build failure, classify it as a NAMED data error
  // (U6) — not INTERNAL_ERROR's "please report this issue" — identifying the
  // offending package source, since ke's parser error carries only line/column.
  let built: Awaited<ReturnType<typeof buildPack>>;
  try {
    built = await buildPack(inputs, {
      name: "pragma",
      version: VERSION,
      sourceRef: entries.map(entryName).join(",") || "embedded",
      prefixes,
    });
  } catch (error) {
    throw await classifySourceBuildError(error, inputs);
  }
  report?.(
    `${built.reused ? "Reused" : "Built"} store ${built.contentHash.slice(0, 12)}`,
  );

  const now = new Date().toISOString();
  const lock: PragmaLock = {
    version: 1,
    contentHash: built.contentHash,
    packs: resolved.map((pkg) => {
      const prev = existing?.packs.find((entry) => entry.name === pkg.name);
      return {
        name: pkg.name,
        source: pkg.source,
        resolved: pkg.resolved,
        resolvedAt: frozen && prev ? prev.resolvedAt : now,
      };
    }),
  };
  const newContent = serializeLock(lock);
  const path = lockPath(runtime.cwd);

  const data: SourcesUpdateData = {
    contentHash: built.contentHash,
    reused: built.reused,
    lockPath: path,
    packs: resolved.map((pkg) => ({
      name: pkg.name,
      resolved: pkg.resolved,
      sourceCount: pkg.sources.length,
    })),
  };

  const undo =
    priorContent !== undefined
      ? writeFile(path, priorContent)
      : deleteFile(path);

  // Install package-provided skills (U10): symlink each resolved package's
  // `skills/*` into the installed-skills root, so `skill list` / `setup skills`
  // see them after an update. Kept in this Task (reversible: created links carry
  // an unlink undo) so `sources update --undo` also removes them.
  const skillLinks = planSkillInstall(resolved).filter(
    (link) => link.action !== "skipped",
  );
  if (skillLinks.length > 0)
    report?.(`Installing ${skillLinks.length} skill(s)`);

  report?.(`Writing ${LOCK_BASENAME}`);
  return gen(function* () {
    yield* $(writeFile(path, newContent, { undo }));
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
export async function classifySourceBuildError(
  error: unknown,
  inputs: readonly { readonly path: string; readonly content: string }[],
): Promise<PragmaError> {
  if (error instanceof PragmaError) return error;
  const parserMessage = error instanceof Error ? error.message : String(error);
  const culprit = await isolateBadSource(inputs);
  const detail = culprit?.message ?? parserMessage;
  const where = culprit
    ? `Package source "${culprit.path}" could not be parsed`
    : "The configured package sources could not be built into a store";
  return PragmaError.configError(`${where}: ${detail}`, {
    recovery: cliRecovery(
      `${RECOVERY_CLI_PREFIX}sources update --verbose`,
      "Re-run with --verbose to see each file as it parses. If a package ships malformed RDF, report it to that package's maintainer.",
    ),
  });
}

/**
 * Re-parse each source alone to find the first that fails to parse.
 *
 * @param inputs - The labelled sources.
 * @returns The offending source's path + parser message, or `undefined` if none
 *   fails in isolation (a build failure unrelated to a single bad source).
 * @note Impure — boots a throwaway ke store per source; error path only.
 */
async function isolateBadSource(
  inputs: readonly { readonly path: string; readonly content: string }[],
): Promise<{ path: string; message: string } | undefined> {
  const { createStore } = await import("@canonical/ke");
  for (const input of inputs) {
    try {
      const store = await createStore({
        sources: [{ content: input.content, path: input.path }],
      });
      store.dispose();
    } catch (error) {
      return {
        path: input.path,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
  return undefined;
}
