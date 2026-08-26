import { readFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { PACKAGE_NAME } from "./packageName.js";

/**
 * Walk up from `from` until a `package.json` names this package, and return
 * its `version`. Exported for tests; production callers use
 * {@link packageVersion}.
 *
 * A manifest that is unreadable, is not JSON, names another package, or
 * carries no version is not a failure — it is an ancestor directory that
 * happens to have a `package.json` (the workspace root, say), so the walk
 * continues. Only running out of parents throws.
 *
 * @note Impure — reads the filesystem.
 */
export function findOwnVersion(from: string): string {
  let dir = from;
  for (;;) {
    try {
      const manifest = JSON.parse(
        readFileSync(path.join(dir, "package.json"), "utf-8"),
      ) as { name?: string; version?: string };
      if (manifest.name === PACKAGE_NAME && manifest.version) {
        return manifest.version;
      }
    } catch {
      // No readable manifest at this level — keep walking.
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(
        `packageVersion: no package.json naming ${PACKAGE_NAME} above ${from}`,
      );
    }
    dir = parent;
  }
}

/**
 * This package's own published version, used as the generators' meta.version
 * — which is also the stamp version core writes into every generated file.
 * The metas previously froze "0.1.0", so stamps could never distinguish
 * releases. Same shape as summon-package's packageVersion: not a JSON import
 * (build-layout coupling), lazy and cached (no IO at module load).
 *
 * @note Impure on first call — reads the filesystem, then caches.
 */
let cached: string | undefined;
export function packageVersion(): string {
  cached ??= findOwnVersion(path.dirname(fileURLToPath(import.meta.url)));
  return cached;
}
