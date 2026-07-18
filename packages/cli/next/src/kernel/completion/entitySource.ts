/**
 * The dynamic-tier seam: where `{kind:"entity"}` completions get their names.
 *
 * Two readers live here, meeting the resolver's {@link EntityNameReader}
 * contract from `types.ts`:
 *
 * - {@link emptyEntityReader} — the PR-C default: no index tier, no names. The
 *   resolver defaults to it, so structural completion never pays a read.
 * - {@link createIndexEntityReader} — the PR2 storeless reader over the active
 *   pack's `index.json`: a lazy `readFileSync` + `JSON.parse` (never a store,
 *   facade, config evaluator, or zod schema), unioning per-type name tables,
 *   with any I/O or parse error degrading to `[]`. {@link indexEntityReader}
 *   and {@link indexCompletionEnv} adapt it to the resolver's `names(type)`
 *   shape so the `__complete` fast path (bin) and the `__complete` verb wire a
 *   real entity tier.
 *
 * The index document shape is the FROZEN `{ name, type }` minimum of PR2's
 * `PackIndex` (`kernel/runtime/graphpack/types.ts`); PR-C may enrich the index
 * without breaking completion.
 *
 * Storeless-graph note: the pack-cache path is INLINED here rather than
 * imported from `kernel/runtime/paths` — that module reaches `kernel/config`,
 * which the storeless-guarantee test (safety.test.ts) forbids on the
 * completion import graph. The two lines of XDG resolution are duplicated on
 * purpose to keep the fast path free of the config layer.
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
// Inlined embedded index (strings only — no store, no zod).
import { indexJson as EMBEDDED_INDEX_JSON } from "../runtime/graphpack/embedded/pack.generated.js";
import type { PackIndex, PackIndexEntity } from "../runtime/graphpack/types.js";
import type { CompletionEnv, EntityNameReader } from "./types.js";

/** The PR-C default reader: no index tier yet, so no entity names. */
export const emptyEntityReader: EntityNameReader = {
  names: () => [],
};

/** The committed project lock basename (mirrors `kernel/runtime/paths`). */
const LOCK_BASENAME = "pragma.lock.json";
/** The pack index filename (kept local so this path never imports the zod schema). */
const INDEX_FILE = "index.json";

/**
 * `$XDG_CACHE_HOME/pragma/packs/<hash>` — a pack's cache directory.
 *
 * Inlined from `kernel/config/paths` + `kernel/runtime/paths` so the completion
 * fast path stays off the config layer (see the module docblock).
 */
function packDir(contentHash: string): string {
  const base = process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache");
  return join(base, "pragma", "packs", contentHash);
}

/** The committed project lock file for a working directory. */
function lockPath(cwd: string): string {
  return join(cwd, LOCK_BASENAME);
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
 * Build a storeless entity-name reader for a working directory (PR2).
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

/**
 * Adapt {@link createIndexEntityReader} to the resolver's {@link EntityNameReader}.
 *
 * PR2's reader is `(type, partial) => string[]`; PR-C's resolver wants
 * `names(type)` and does its own case-insensitive ranking against the partial.
 * So the adapter asks the index for ALL names of the type (empty partial) and
 * lets the resolver's `rankCandidates` filter — PR-C's ranking semantics win,
 * and the lazy index load is shared across `names()` calls.
 *
 * @param cwd - The project directory (to resolve the active pack).
 * @returns An entity-name reader backed by the active pack's index.
 */
export function indexEntityReader(cwd: string): EntityNameReader {
  const read = createIndexEntityReader(cwd);
  return { names: (type) => read(type, "") };
}

/**
 * The completion environment whose entity tier reads the active pack's index.
 * Wired at the `__complete` fast path (bin) and the `__complete` verb.
 *
 * @param cwd - The project directory (to resolve the active pack).
 * @returns A {@link CompletionEnv} with the index-backed entity reader.
 */
export function indexCompletionEnv(cwd: string): CompletionEnv {
  return { entities: indexEntityReader(cwd) };
}
