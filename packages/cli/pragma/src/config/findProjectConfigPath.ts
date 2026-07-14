import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

/**
 * Find the nearest `pragma.config.json` at or above `cwd`.
 *
 * Walks up the directory tree so pragma works from anywhere inside a
 * project. The walk is bounded: it stops after checking the first
 * directory that contains `.git` (the repository root), after checking
 * the home directory, and at the filesystem root — a config outside the
 * repository or home never leaks in.
 *
 * @param cwd - Directory to start from.
 * @returns Absolute path of the nearest config file, or `undefined`.
 * @note Impure — probes the filesystem while walking up.
 */
export default function findProjectConfigPath(cwd: string): string | undefined {
  const home = homedir();
  let dir = resolve(cwd);

  while (true) {
    const candidate = join(dir, "pragma.config.json");
    if (existsSync(candidate)) {
      return candidate;
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
