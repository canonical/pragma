/**
 * Resolve TTL source patterns to absolute file paths.
 *
 * Mirrors ke's own source resolution (wildcard detection + `globSync`,
 * literal paths checked for existence) so the files the CLI reads and
 * hashes are exactly the files `createStore` loads.
 *
 * @note Impure — reads filesystem to expand globs and check existence.
 */

import { existsSync, globSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Expand file paths and glob patterns into absolute file paths.
 *
 * @param patterns - Literal paths or glob patterns (`*`, `?`, `[`).
 * @param cwd - Base directory for resolving relative patterns.
 * @returns Absolute paths of all matched, existing files.
 */
export default function resolveSourceFiles(
  patterns: readonly string[],
  cwd: string,
): string[] {
  const files: string[] = [];

  for (const pattern of patterns) {
    if (
      pattern.includes("*") ||
      pattern.includes("?") ||
      pattern.includes("[")
    ) {
      for (const file of globSync(pattern, { cwd })) {
        files.push(resolve(cwd, file));
      }
    } else {
      const absPath = resolve(cwd, pattern);
      if (existsSync(absPath)) {
        files.push(absPath);
      }
    }
  }

  return files;
}
