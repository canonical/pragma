/**
 * Filesystem locations for the store layer: the content-addressed pack cache,
 * the git-ref checkout cache, and the project lock file.
 *
 * The pack cache lives under `$XDG_CACHE_HOME/pragma/packs/<contentHash>/`
 * (content-addressed, so a new source set is a new directory and invalidation
 * is free); ref checkouts under `.../pragma/refs/`. The lock is a committed
 * project artifact at `<cwd>/pragma.lock.json`. All cache paths derive from the
 * config kernel's {@link cacheDir}, so the XDG isolation the tests install
 * contains them.
 */

import { join } from "node:path";
import { cacheDir } from "../config/paths.js";

/** The lock file basename, committed at the project root. */
export const LOCK_BASENAME = "pragma.lock.json";

/** `$XDG_CACHE_HOME/pragma/packs` — the content-addressed pack cache root. */
export function packsCacheDir(): string {
  return join(cacheDir(), "packs");
}

/** `$XDG_CACHE_HOME/pragma/refs` — cached git-ref checkouts. */
export function refsCacheDir(): string {
  return join(cacheDir(), "refs");
}

/** The cache directory for a pack, named by its content hash. */
export function packDir(contentHash: string): string {
  return join(packsCacheDir(), contentHash);
}

/** The project lock file for a working directory. */
export function lockPath(cwd: string): string {
  return join(cwd, LOCK_BASENAME);
}
