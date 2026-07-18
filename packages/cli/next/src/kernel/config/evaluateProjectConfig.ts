/**
 * Evaluate `pragma.config.ts` with a content-hash cache (D7).
 *
 * The project config is real TypeScript — evaluated via Bun's native dynamic
 * import of the file's `default` export. Because evaluation is the cost, the
 * result is cached by the SHA-256 of the file's source under
 * `$XDG_STATE_HOME/pragma/config-cache/<hash>.json` (stories are data, so the
 * validated config is JSON-serializable). Warm path: hash → cache hit →
 * `JSON.parse`. Cold path: import → validate → write cache.
 *
 * The dynamic `import()` must also work inside the `bun build --compile`
 * binary; the perf spike verifies it and records the outcome (subprocess
 * fallback, or accepting `pragma.config.js`, if it does not).
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { configCacheDir } from "./paths.js";
import { parseRawConfig } from "./schema.js";
import type { RawConfig } from "./types.js";

/** The cache file path for a given source hash. */
function cachePathFor(hash: string): string {
  return join(configCacheDir(), `${hash}.json`);
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
 * @throws PragmaError with code `CONFIG_ERROR` when the evaluated shape is bad.
 * @note Impure — reads the file, may import it, and writes the cache.
 */
export async function evaluateProjectConfig(path: string): Promise<RawConfig> {
  const source = readFileSync(path, "utf-8");
  const hash = createHash("sha256").update(source).digest("hex");
  const cachePath = cachePathFor(hash);

  try {
    return JSON.parse(readFileSync(cachePath, "utf-8")) as RawConfig;
  } catch {
    // Cache miss — evaluate below.
  }

  const module = (await import(pathToFileURL(path).href)) as {
    default?: unknown;
  };
  const config = parseRawConfig(module.default, path);
  writeCache(cachePath, config);
  return config;
}
