import { readFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { embeddedPackageVersion } from "@canonical/summon-core";
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
 * This package's own published version, used as the semver line for the
 * `@canonical/*` config dependencies the templates emit (the fixed-version
 * train means our version IS the train's version).
 *
 * Not a `package.json` JSON import: the relative path (`../../package.json`)
 * is measured from the source file, and the `src → dist/esm` build emits this
 * file one level deeper, so the same specifier resolves to `dist/package.json`
 * — which does not exist. That breaks Node from `dist/esm` AND breaks any
 * bundler that resolves the compiled entry (the CLI's `bun build --compile`
 * fails outright). The sibling `PACKAGE_NAME` sidesteps this with a constant;
 * the version cannot be a constant, because releases bump `package.json`
 * mechanically and a constant would drift silently on the first one. Walking
 * up from THIS module's location is correct from `src/` and from `dist/esm/`
 * alike, with no build-layout coupling to re-break.
 *
 * Lazy and cached deliberately: nothing is read at module load, so importing
 * this module performs no IO and cannot throw at startup.
 *
 * A `bun build --compile` host is the one layout the walk cannot serve: no
 * `package.json` exists anywhere under the binary's virtual `/$bunfs`
 * filesystem. Such a host captures this package's version at BUILD time —
 * from the very manifest the walk would find — and injects it through
 * summon-core's embedded store (`setEmbeddedPackageVersions`), so a compiled
 * run resolves the same value a source run walks to. The walk stays primary:
 * on disk it can never be stale.
 *
 * @note Impure on first call — reads the filesystem, then caches.
 */
let cached: string | undefined;
export function packageVersion(): string {
  cached ??= resolveOwnVersion(path.dirname(fileURLToPath(import.meta.url)));
  return cached;
}

/**
 * Disk walk first; the host-injected embedded version as the compiled-binary
 * fallback. Exported for tests; production callers use {@link packageVersion}.
 */
export function resolveOwnVersion(from: string): string {
  try {
    return findOwnVersion(from);
  } catch (error) {
    const embedded = embeddedPackageVersion(PACKAGE_NAME);
    if (embedded !== undefined) return embedded;
    throw error;
  }
}
