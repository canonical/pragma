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
  type Task,
  writeFile,
} from "@canonical/task";
import { VERSION } from "../../constants.js";
import type { PackageEntry } from "../../kernel/config/types.js";
import { buildPack } from "../../kernel/runtime/graphpack/build.js";
import {
  type PragmaLock,
  readLock,
  serializeLock,
} from "../../kernel/runtime/lock.js";
import { lockPath } from "../../kernel/runtime/paths.js";
import { parsePackageEntry } from "../../kernel/runtime/refs/parseRef.js";
import {
  harvestPrefixes,
  type ResolvedPackage,
  resolvePackage,
} from "../../kernel/runtime/refs/resolve.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
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

  const layers = await runtime.loadConfig();
  const entries = layers.config.packages ?? [];
  const existing = readLock(runtime.cwd);
  const priorContent = existing ? serializeLock(existing) : undefined;

  const resolved: ResolvedPackage[] = [];
  for (const entry of entries) {
    const ref = parsePackageEntry(entry);
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
  const built = await buildPack(inputs, {
    name: "pragma",
    version: VERSION,
    sourceRef: entries.map(entryName).join(",") || "embedded",
    prefixes,
  });

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
  return gen(function* () {
    yield* $(writeFile(path, newContent, { undo }));
    return data;
  });
}
