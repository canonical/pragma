/**
 * Local package loader.
 *
 * Resolves semantic packages from the local filesystem:
 * - `file://` refs → direct path check
 * - `npm` refs → upward `node_modules` walk from this module's location
 *
 * The node_modules walk avoids `require.resolve('pkg/package.json')` which
 * breaks for packages with strict `exports` fields (e.g. @canonical/anatomy-dsl).
 *
 * @note Impure — reads filesystem.
 */

import { existsSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import type { PackageRef } from "../../refs/operations/parseRef.js";
import type { PackageLoader, SemanticPackage } from "../semanticPackage.js";
import readPackageDir from "./readPackageDir.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export default function createLocalLoader(): PackageLoader {
  return {
    name: "local",
    resolve(ref: PackageRef): SemanticPackage | undefined {
      switch (ref.kind) {
        case "file":
          return resolveFileRef(ref.pkg, ref.path);
        case "npm":
          return resolveNpmRef(ref.pkg);
        case "git":
          // LocalLoader does not handle git refs
          return undefined;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// file:// resolution
// ---------------------------------------------------------------------------

function resolveFileRef(
  pkg: string,
  path: string,
): SemanticPackage | undefined {
  if (!existsSync(path)) return undefined;

  const { version, graphs, skills } = readPackageDir(path);
  return { name: pkg, version, source: "local", graphs, skills };
}

// ---------------------------------------------------------------------------
// npm resolution via node_modules walk
// ---------------------------------------------------------------------------

/**
 * Walk up the directory tree from this module's location, checking each
 * `node_modules` directory for the target package. This bypasses
 * `require.resolve` entirely — no `exports` field issues.
 */
function resolveNpmRef(pkg: string): SemanticPackage | undefined {
  const dir = findPackageDir(pkg);
  if (!dir) return undefined;

  const { version, graphs, skills } = readPackageDir(dir);
  return { name: pkg, version, source: "local", graphs, skills };
}

/**
 * Find a package directory by walking up from this module's location.
 *
 * Checks each ancestor's `node_modules/<pkg>` directory. Handles both
 * scoped (`@scope/name`) and unscoped packages. Follows symlinks via
 * `realpathSync` so hoisted workspace layouts resolve correctly.
 */
function findPackageDir(pkg: string): string | undefined {
  const segments = pkg.split("/");
  let current = import.meta.dirname;

  while (current !== dirname(current)) {
    const candidate = join(current, "node_modules", ...segments);
    if (existsSync(candidate)) {
      try {
        return realpathSync(candidate);
      } catch {
        return candidate;
      }
    }
    current = dirname(current);
  }

  return undefined;
}
