import * as path from "node:path";
import { exists, ifElseM, pure, type Task } from "@canonical/task";
import type { PackageManager } from "../types.js";

/**
 * Detect the package manager in use.
 *
 * @note Impure — probes the filesystem for lock files.
 */
export default function detectPackageManager(
  cwd: string,
): Task<PackageManager> {
  const bunLock = path.join(cwd, "bun.lockb");
  const bunLock2 = path.join(cwd, "bun.lock");
  const yarnLock = path.join(cwd, "yarn.lock");
  const pnpmLock = path.join(cwd, "pnpm-lock.yaml");

  const parentBunLock = path.join(cwd, "..", "..", "bun.lockb");
  const parentBunLock2 = path.join(cwd, "..", "..", "bun.lock");

  return ifElseM(
    exists(bunLock),
    pure("bun" as const),
    ifElseM(
      exists(bunLock2),
      pure("bun" as const),
      ifElseM(
        exists(parentBunLock),
        pure("bun" as const),
        ifElseM(
          exists(parentBunLock2),
          pure("bun" as const),
          ifElseM(
            exists(yarnLock),
            pure("yarn" as const),
            ifElseM(
              exists(pnpmLock),
              pure("pnpm" as const),
              pure("bun" as const),
            ),
          ),
        ),
      ),
    ),
  );
}
