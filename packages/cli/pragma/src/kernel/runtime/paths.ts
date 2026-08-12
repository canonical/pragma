/**
 * Filesystem locations for the store layer: the content-addressed pack cache,
 * the git-ref checkout cache, and the per-project active-pack pointer.
 *
 * The pack cache lives under `$XDG_CACHE_HOME/<bin>/packs/<contentHash>/`
 * (content-addressed, so a new source set is a new directory and invalidation
 * is free); ref checkouts under `.../<bin>/refs/`. Which pack answers a
 * project's reads is recorded by a one-line POINTER under
 * `.../<bin>/projects/` — the content hash `sources update` last built there,
 * and nothing else. It lives in the cache rather than the repo because the pack
 * it names is machine-local: a committed pointer would promise a store the next
 * machine does not have.
 *
 * A LEAF module on purpose: it imports node builtins and the distribution's
 * {@link BIN_NAME}, and owns the cache root's XDG resolution outright
 * (`kernel/config/paths.ts` keeps config and state). The storeless `__complete`
 * fast path (`kernel/completion/entitySource.ts`) has to read the pointer, and
 * `completion/safety.test.ts` forbids the config LAYER anywhere on that import
 * graph — so the cache root is resolved here rather than imported. `constants.ts`
 * is not the config layer: it reads inert data, and that same guard positive-lists
 * it.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { BIN_NAME } from "../../constants.js";

/** `$XDG_CACHE_HOME/<bin>` (default `~/.cache/<bin>`) — the cache root. */
function cacheDir(): string {
  const base = process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache");
  return join(base, BIN_NAME);
}

/** `$XDG_CACHE_HOME/<bin>/packs` — the content-addressed pack cache root. */
export function packsCacheDir(): string {
  return join(cacheDir(), "packs");
}

/** `$XDG_CACHE_HOME/<bin>/refs` — cached git-ref checkouts. */
export function refsCacheDir(): string {
  return join(cacheDir(), "refs");
}

/** The cache directory for a pack, named by its content hash. */
export function packDir(contentHash: string): string {
  return join(packsCacheDir(), contentHash);
}

/**
 * The active-pack pointer for a project: `$XDG_CACHE_HOME/<bin>/projects/<key>`.
 *
 * The key is the SHA-256 of the resolved `cwd` — a hash rather than the path
 * itself so a deep project directory can never exceed the 255-byte filename
 * limit, and a cryptographic one so two projects can never collide onto each
 * other's graph.
 */
export function activePackPath(cwd: string): string {
  return join(
    cacheDir(),
    "projects",
    createHash("sha256").update(resolve(cwd)).digest("hex"),
  );
}

/**
 * The content hash of the pack `sources update` built for a project.
 *
 * @param cwd - The project directory.
 * @returns The 64-hex content hash, or `undefined` when the project was never
 *   built. A pointer that is unreadable, or that does not hold exactly one
 *   hash, is treated as absent — a corrupt pointer must never name an arbitrary
 *   cache directory.
 * @note Impure — reads the pointer from the cache.
 */
export function readActivePack(cwd: string): string | undefined {
  const path = activePackPath(cwd);
  if (!existsSync(path)) return undefined;
  try {
    const hash = readFileSync(path, "utf-8").trim();
    return /^[0-9a-f]{64}$/.test(hash) ? hash : undefined;
  } catch {
    return undefined;
  }
}
