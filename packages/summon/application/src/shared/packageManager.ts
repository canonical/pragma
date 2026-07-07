import { existsSync } from "node:fs";
import * as path from "node:path";

/** Package managers we know how to run an install with, in preference order. */
const CANDIDATES = ["bun", "npm", "pnpm", "yarn"] as const;
export type PackageManager = (typeof CANDIDATES)[number];

/** Executable extensions to check on Windows; empty string covers POSIX. */
const EXECUTABLE_EXTENSIONS =
  process.platform === "win32" ? ["", ".cmd", ".exe", ".bat"] : [""];

/** Whether `bin` is found on any PATH entry. */
function onPath(bin: string): boolean {
  const dirs = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  for (const dir of dirs) {
    for (const ext of EXECUTABLE_EXTENSIONS) {
      if (existsSync(path.join(dir, bin + ext))) return true;
    }
  }
  return false;
}

/**
 * Pick a package manager that is actually installed on this machine, probing
 * candidates in preference order (bun → npm → pnpm → yarn) by looking each one
 * up on PATH. Returns `null` if none are available.
 *
 * Synchronous and side-effect-free (a PATH lookup, no process spawn), so it can
 * run while the generator builds its task tree. The previous code hard-coded
 * `bun install`, which fails on a machine that only has Node/npm; probing keeps
 * the scaffold's optional install step working regardless of which manager the
 * user has.
 *
 * @note Impure — reads process.env.PATH and probes the filesystem.
 */
export function pickPackageManager(): PackageManager | null {
  for (const pm of CANDIDATES) {
    if (onPath(pm)) return pm;
  }
  return null;
}
