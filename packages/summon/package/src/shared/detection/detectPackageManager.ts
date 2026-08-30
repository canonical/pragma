import * as path from "node:path";
import { exists, ifElseM, pure, type Task } from "@canonical/task";
import type { PackageManager } from "../types.js";
import ancestorDirs from "./ancestorDirs.js";

/**
 * Lockfiles in detection-priority order within one directory. Both bun
 * lockfile generations are probed; the remaining managers follow the
 * documented preference order.
 */
const LOCKFILES: ReadonlyArray<readonly [string, PackageManager]> = [
  ["bun.lockb", "bun"],
  ["bun.lock", "bun"],
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["package-lock.json", "npm"],
];

/**
 * Detect the package manager in use: the nearest directory (walking from
 * `cwd` up to the filesystem root) that holds a lockfile wins, and within a
 * directory the priority is bun → pnpm → yarn → npm. Falls back to bun when
 * no lockfile is found anywhere.
 *
 * @note Impure — probes the filesystem for lock files.
 */
export default function detectPackageManager(
  cwd: string,
): Task<PackageManager> {
  const probes = ancestorDirs(cwd).flatMap((dir) =>
    LOCKFILES.map(
      ([file, manager]) => [path.join(dir, file), manager] as const,
    ),
  );

  return probes.reduceRight<Task<PackageManager>>(
    (fallback, [lockPath, manager]) =>
      ifElseM(exists(lockPath), pure(manager), fallback),
    pure("bun"),
  );
}
