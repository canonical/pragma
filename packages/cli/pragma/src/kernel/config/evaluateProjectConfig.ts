/**
 * Evaluate `pragma.config.ts` with an invalidating cache (D7).
 *
 * The project config is real TypeScript — evaluated via the runtime's native
 * dynamic import of the file's `default` export. Because evaluation is the cost,
 * the validated (JSON-serializable) result is cached under
 * `$XDG_STATE_HOME/pragma/config-cache/<key>.json`. Warm path: derive key →
 * cache hit → `JSON.parse` (sub-ms). Cold path: import → validate → write cache.
 *
 * The cache key is `sha256(path + entry-mtime + VERSION)`, NOT a hash of the
 * entry file's bytes. This means:
 *   - editing the entry file bumps its mtime → new key → re-evaluation, in every
 *     process (the byte-hash scheme missed nothing here, but see the limitation);
 *   - a pragma upgrade bumps VERSION → new key → re-evaluation (a new binary must
 *     never serve a config the old one cached).
 *
 * The key does NOT cover the config SCHEMA, and cannot: VERSION moves on release,
 * while the schema moves on a commit. So the warm path RE-VALIDATES the cached
 * JSON through `parseRawConfig` rather than trusting it. Measured, before this
 * fix: with `detail: "banana"` and the removed `completion.caseSensitive` in a
 * project config, a cold run failed at load as PR6 promises, and a warm run
 * against a cache entry written under the same VERSION printed
 * `detail: banana [project]` and exited 0 — the exact silent acceptance the
 * removal check exists to end, restored by the cache. Re-validation is a zod pass
 * over an already-parsed object (no re-import, no fs walk) on a path that is
 * already off the storeless `--help`/`__complete` fast path. Bumping a schema
 * revision into the key was the alternative and is strictly weaker: it
 * invalidates once, and the next schema edit is unguarded again.
 *
 * LIMITATION (accepted, per the review fold): a *transitively*-imported file
 * (e.g. `./pkgs.ts`) edited without touching the entry's mtime is not detected
 * across processes. The fix that would catch it — `bun build --bundle` the config
 * and key on the bundle hash — is unavailable: Bun's bundler cannot run inside
 * the `bun build --compile` binary (no source filesystem at `/$bunfs/root`), and
 * bundling on every load would also blow the warm-load budget. Touch the entry
 * (or bump VERSION) to force a rebuild.
 */

import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { PROJECT_CONFIG_FILENAME, VERSION } from "../../constants.js";
import { PragmaError } from "../error/PragmaError.js";
import { configCacheDir } from "./paths.js";
import { parseRawConfig } from "./schema.js";
import type { RawConfig } from "./types.js";

/** The cache file path for a given key. */
function cachePathFor(key: string): string {
  return join(configCacheDir(), `${key}.json`);
}

/**
 * The cache key for a project-config file: `sha256(path + mtime + VERSION)`.
 * Cheap to compute (a `stat`, not a full read) and threaded onto the import URL
 * below so a long-lived process re-evaluates when the key changes.
 */
function cacheKey(path: string): string {
  const { mtimeMs } = statSync(path);
  return createHash("sha256")
    .update(`${path}\u0000${mtimeMs}\u0000${VERSION}`)
    .digest("hex");
}

/** Best-effort atomic write of the validated config to the cache. */
function writeCache(cachePath: string, config: RawConfig): void {
  try {
    mkdirSync(configCacheDir(), { recursive: true });
    const tempPath = `${cachePath}.tmp`;
    writeFileSync(tempPath, JSON.stringify(config));
    renameSync(tempPath, cachePath);
  } catch {
    // A read-only or racing cache is non-fatal — evaluation still returns.
  }
}

/**
 * Evaluate a project config file, serving a warm cache hit when possible.
 *
 * @param path - Absolute path to `pragma.config.{ts,js}`.
 * @returns The validated raw config the file declares.
 * @throws PragmaError with code `CONFIG_ERROR` when the evaluated shape is bad —
 *   on the warm path as well as the cold one, so a cache entry a schema edit has
 *   since invalidated fails at load rather than being served.
 * @note Impure — reads the file, may import it, and writes the cache.
 */
export async function evaluateProjectConfig(path: string): Promise<RawConfig> {
  const key = cacheKey(path);
  const cachePath = cachePathFor(key);

  let cached: unknown;
  try {
    cached = JSON.parse(readFileSync(cachePath, "utf-8"));
  } catch {
    // Cache miss — evaluate below.
  }
  // OUTSIDE the try: a CONFIG_ERROR from re-validating a hit must propagate, not
  // be swallowed as a miss and paper itself over by re-evaluating the same file.
  if (cached !== undefined) return parseRawConfig(cached, path);

  // Cache-bust the dynamic import with the key so a long-lived process (the
  // `mcp` server, which re-reads config per tool call) picks up an edited entry
  // instead of a previously imported module. Node honours the query; under Bun
  // the module cache is path-keyed and ignores it, but a fresh process always
  // re-reads, so cross-process correctness holds regardless.
  const url = `${pathToFileURL(path).href}?v=${key}`;
  // Evaluating real TypeScript can throw for reasons `parseRawConfig` never sees:
  // a syntax error, a bad import, or a top-level throw in the config module. Left
  // unwrapped, that raw throw collapses to INTERNAL_ERROR ("please report this
  // issue") on EVERY command that reads config. Name it: a CONFIG_ERROR that
  // identifies the offending file and the underlying reason.
  let module: { default?: unknown };
  try {
    module = (await import(url)) as { default?: unknown };
  } catch (error) {
    if (error instanceof PragmaError) throw error;
    const reason = error instanceof Error ? error.message : String(error);
    throw PragmaError.configError(
      `Could not load project config ${path}: ${reason}`,
      {
        recovery: {
          message: `Fix the error in your ${PROJECT_CONFIG_FILENAME} (it must evaluate to a default export), then try again.`,
        },
      },
    );
  }
  const config = parseRawConfig(module.default, path);
  writeCache(cachePath, config);
  return config;
}
