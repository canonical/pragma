/**
 * Collect the `sources status` payload — storeless.
 *
 * Reports the store's readiness without booting it: it reads the lock, the
 * resolved config, and — if the locked pack is cached — the manifest and the
 * index.json count (a plain `JSON.parse`, no store, no oxigraph). This is the
 * capability that must stay off the store factory (the storeless-guarantee spy
 * covers it), so it reaches for the pack files directly rather than through a
 * store session. It absorbs the v1 `info store` summary.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PackageEntry } from "../../kernel/config/types.js";
import { readManifest } from "../../kernel/runtime/graphpack/manifest.js";
import { INDEX_FILE } from "../../kernel/runtime/graphpack/types.js";
import { readLock } from "../../kernel/runtime/lock.js";
import { packDir } from "../../kernel/runtime/paths.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import type {
  SourceStaleness,
  SourceStatusEntry,
  SourcesStatusData,
} from "./types.js";

const entryName = (entry: PackageEntry): string =>
  typeof entry === "string" ? entry : entry.name;
const entrySource = (entry: PackageEntry): string =>
  typeof entry === "string" ? entry : (entry.source ?? entry.name);

/**
 * The distinct-abox entity count from a cached pack's index.json (storeless).
 *
 * Only reached for LEGACY packs whose manifest predates the persisted
 * `entityCount` (A10) — a current pack's count is read straight from the
 * manifest, no index parse. Counts distinct abox subjects so the figure matches
 * both the manifest count and `info`'s `entityTotal` (A1).
 */
function indexEntityCount(dir: string): number | null {
  const path = join(dir, INDEX_FILE);
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as {
      entities?: { box?: string; uri?: string; name?: string }[];
    };
    if (!Array.isArray(parsed.entities)) return null;
    const subjects = new Set<string>();
    for (const entity of parsed.entities) {
      if (entity.box === "abox") subjects.add(entity.uri ?? entity.name ?? "");
    }
    return subjects.size;
  } catch {
    return null;
  }
}

/**
 * Assemble the `sources status` payload for the runtime's cwd.
 *
 * @param runtime - The per-invocation runtime.
 * @returns The storeless status payload.
 * @note Impure — reads config, the lock, and the pack cache from disk.
 */
export async function collectStatus(
  runtime: PragmaRuntime,
): Promise<SourcesStatusData> {
  const layers = await runtime.loadConfig();
  const entries = layers.config.packages ?? [];
  const lock = readLock(runtime.cwd);

  const dir = lock ? packDir(lock.contentHash) : undefined;
  const manifest = dir ? readManifest(dir) : undefined;
  const cached = manifest !== undefined;

  const sources: SourceStatusEntry[] = entries.map((entry) => {
    const name = entryName(entry);
    const ref = entrySource(entry);
    const lockEntry = lock?.packs.find((pack) => pack.name === name);
    let staleness: SourceStaleness;
    if (!lock || !cached) {
      staleness = "uncached";
    } else if (!lockEntry || lockEntry.source !== ref) {
      staleness = "config-drift";
    } else {
      staleness = "up-to-date";
    }
    return { name, ref, resolved: lockEntry?.resolved ?? null, staleness };
  });

  return {
    cwd: runtime.cwd,
    lockPresent: lock !== undefined,
    contentHash: lock?.contentHash ?? null,
    cached,
    builtAt: manifest?.createdAt ?? null,
    // Prefer the manifest's persisted count (no index parse); a legacy pack
    // without it falls back to counting the index's abox subjects (A10).
    entityCount:
      dir && cached ? (manifest?.entityCount ?? indexEntityCount(dir)) : null,
    sources,
  };
}
