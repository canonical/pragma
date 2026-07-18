/**
 * Build the `sources update` Task.
 *
 * The heavy work — resolve every configured package (git clone/fetch, file
 * verify, npm resolve), then build the ONE combined content-addressed pack — is
 * async and not expressible as a task effect (the effect set is fs + exec), so
 * it runs eagerly here; the returned Task models the one project mutation, the
 * `pragma.lock.json` write, with an undo that restores (or removes) the prior
 * lock. Under `--frozen` each package re-resolves to the lock's pinned revision
 * and keeps its `resolvedAt`, so an unchanged update rewrites a byte-identical
 * lock.
 *
 * Note (deviation): because the build is eager, `--dry-run` resolves + builds
 * (populating the content-addressed cache — idempotent) before previewing the
 * lock write; it withholds only the lock file itself. The build is not a
 * task effect, so this is the cleanest split the effect framework allows.
 */

import { $, deleteFile, gen, type Task, writeFile } from "@canonical/task";
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
 * Resolve, build, and produce the lock-writing Task.
 *
 * @param runtime - The per-invocation runtime.
 * @param frozen - When true, re-resolve to the lock's pinned revisions only.
 * @returns A Task that writes `pragma.lock.json` and returns the update result.
 * @note Impure — resolves packages (may hit git) and builds the pack eagerly.
 */
export async function buildUpdateTask(
  runtime: PragmaRuntime,
  frozen: boolean,
): Promise<Task<SourcesUpdateData>> {
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

  const prefixes = { ...CORE_PREFIXES, ...(layers.config.prefixes ?? {}) };
  const built = await buildPack(
    resolved.flatMap((pkg) => pkg.sources),
    {
      name: "pragma",
      version: VERSION,
      sourceRef: entries.map(entryName).join(",") || "embedded",
      prefixes,
    },
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
  return gen(function* () {
    yield* $(writeFile(path, newContent, { undo }));
    return data;
  });
}
