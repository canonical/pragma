/**
 * The storeless entity-completion seam PR-C consumes.
 *
 * `createIndexEntityReader(cwd)` returns a fast, synchronous reader over the
 * active pack's `index.json`: given a prefixed type filter and a partial token,
 * it returns matching entity names, sorted. It NEVER boots the store — it reads
 * the locked pack's index straight off disk (falling back to the embedded
 * pack's inlined index), and parses with plain `JSON.parse` so the `__complete`
 * fast path stays free of both oxigraph and zod. It relies only on the FROZEN
 * `{ name, type }` index minimum, so PR-C can enrich the index without breaking
 * completion.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
// Inlined embedded index — its OWN generated module (only the index string), so
// the storeless `__complete` path never pulls the n-quads/schema/manifest
// strings that live in `pack.generated.ts`.
import { indexJson as EMBEDDED_INDEX_JSON } from "../runtime/graphpack/embedded/pack.index.generated.js";
import type { PackIndex, PackIndexEntity } from "../runtime/graphpack/types.js";
import { lockPath, packDir } from "../runtime/paths.js";

/** The pack index filename (kept local so this path never imports the zod schema). */
const INDEX_FILE = "index.json";

/**
 * Read the active pack's storeless index (the locked pack, else the embedded
 * fallback), for the resource browser's list/autocomplete. Never boots the
 * store, never validates with zod — a plain `JSON.parse` off disk. Returns
 * `undefined` when no index is reachable, so callers degrade to a recovery hint.
 */
export function readPackIndex(cwd: string): PackIndex | undefined {
  return loadActiveIndex(cwd);
}

/**
 * Sum a pack index's per-type instance counts — the "total entities" figure
 * `info` and `doctor` report. Works over any {@link PackIndex}, whether read
 * storelessly via {@link readPackIndex} or taken from a booted store session.
 *
 * @param index - A pack index.
 * @returns The total number of indexed entity instances across every type.
 */
export function entityTotal(index: PackIndex): number {
  return Object.values(index.instanceCountByType).reduce(
    (sum, n) => sum + n,
    0,
  );
}

/** Load the active pack's index: the locked pack, else the embedded fallback. */
function loadActiveIndex(cwd: string): PackIndex | undefined {
  try {
    const path = lockPath(cwd);
    if (existsSync(path)) {
      const lock = JSON.parse(readFileSync(path, "utf-8")) as {
        contentHash?: unknown;
      };
      if (typeof lock.contentHash === "string") {
        const indexPath = join(packDir(lock.contentHash), INDEX_FILE);
        if (existsSync(indexPath)) {
          return JSON.parse(readFileSync(indexPath, "utf-8")) as PackIndex;
        }
      }
    }
  } catch {
    // Fall through to the embedded fallback on any read/parse failure.
  }
  try {
    return JSON.parse(EMBEDDED_INDEX_JSON) as PackIndex;
  } catch {
    return undefined;
  }
}

/** Whether an entity matches a prefixed type filter (primary type or any type). */
function matchesType(entity: PackIndexEntity, type: string): boolean {
  if (!type) return true;
  if (entity.type === type) return true;
  return Array.isArray(entity.types) && entity.types.includes(type);
}

/**
 * Build a storeless entity-name reader for a working directory.
 *
 * @param cwd - The project directory (to resolve the active pack).
 * @returns `(type, partial) => string[]` — sorted entity names of `type`
 *   starting with `partial`. The index is loaded once, lazily, and reused.
 */
export function createIndexEntityReader(
  cwd: string,
): (type: string, partial: string) => string[] {
  let index: PackIndex | undefined;
  let loaded = false;
  return (type, partial) => {
    if (!loaded) {
      index = loadActiveIndex(cwd);
      loaded = true;
    }
    if (!index) return [];
    const names = new Set<string>();
    for (const entity of index.entities) {
      if (!matchesType(entity, type)) continue;
      if (partial && !entity.name.startsWith(partial)) continue;
      names.add(entity.name);
    }
    return [...names].sort();
  };
}
