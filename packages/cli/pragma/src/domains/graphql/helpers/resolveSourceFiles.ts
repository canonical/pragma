/**
 * Resolve TTL source patterns to absolute file paths.
 *
 * Mirrors ke's own source resolution (wildcard detection + `globSync`,
 * literal paths checked for existence) so the files the CLI reads and
 * hashes are exactly the files `createStore` loads.
 *
 * @note Impure — reads filesystem to expand globs and check existence.
 */

import { globSync, statSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Whether a path points at an existing regular file.
 *
 * Guards against a directory (or the empty-string path, which resolves to the
 * cwd directory) slipping through as a "source" and later crashing readFileSync
 * with EISDIR.
 *
 * @param absPath - Absolute path to check.
 * @returns True when the path exists and is a regular file.
 */
function isRegularFile(absPath: string): boolean {
  try {
    return statSync(absPath).isFile();
  } catch {
    return false;
  }
}

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
        const absPath = resolve(cwd, file);
        if (isRegularFile(absPath)) {
          files.push(absPath);
        }
      }
    } else {
      const absPath = resolve(cwd, pattern);
      if (isRegularFile(absPath)) {
        files.push(absPath);
      }
    }
  }

  return files;
}
