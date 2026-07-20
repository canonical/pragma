/**
 * Locate the nearest project config by walking up from `cwd`.
 *
 * Looks for `pragma.config.ts` (or, as a compiled-binary fallback,
 * `pragma.config.js`) at or above `cwd`. The walk is bounded: it stops after
 * the first directory containing `.git` (the repo root), after the home
 * directory, and at the filesystem root — a config outside the repo or home
 * never leaks in. Ported from the v1 `findProjectConfigPath`.
 */

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

/** Candidate project-config filenames, in preference order. */
const CANDIDATES = ["pragma.config.ts", "pragma.config.js"] as const;

/**
 * Find the nearest project config file at or above `cwd`.
 *
 * @param cwd - Directory to start the walk from.
 * @returns The absolute path of the nearest config, or `undefined`.
 * @note Impure — probes the filesystem while walking up.
 */
export function findProjectConfig(cwd: string): string | undefined {
  const home = homedir();
  let dir = resolve(cwd);

  while (true) {
    for (const name of CANDIDATES) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) {
        return candidate;
      }
    }
    if (existsSync(join(dir, ".git")) || dir === home) {
      return undefined;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
  }
}
