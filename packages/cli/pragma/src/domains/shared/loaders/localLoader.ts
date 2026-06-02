/**
 * Local package loader.
 *
 * Resolves semantic packages from the local filesystem:
 * - `file://` refs → direct path check
 * - All ref kinds → upward `node_modules` walk from this module's location
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
      // file:// refs → direct path check first
      if (ref.kind === "file") {
        if (!existsSync(ref.path)) return undefined;
        const { version, graphs, skills } = readPackageDir(ref.path);
        return { name: ref.pkg, version, source: "local", graphs, skills };
      }

      // All ref kinds → try node_modules walk
      const dir = findPackageDir(ref.pkg);
      if (!dir) return undefined;

      const { version, graphs, skills } = readPackageDir(dir);
      return { name: ref.pkg, version, source: "local", graphs, skills };
    },
  };
}

// ---------------------------------------------------------------------------
// node_modules walk
// ---------------------------------------------------------------------------

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
