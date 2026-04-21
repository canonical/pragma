/**
 * Design system package registry and resolution.
 *
 * Resolves semantic packages from three sources (in priority order):
 * 1. file:// local path (development)
 * 2. git ref cache (shared/CI)
 * 3. require.resolve from node_modules (npm fallback)
 *
 * The package list itself is configurable via pragma.config.json `packages`
 * field. When absent, the hardcoded DEFAULT_PACKAGES are used.
 */

import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import type { PackageRef } from "../refs/operations/parseRef.js";
import { gitCacheDir } from "../refs/operations/paths.js";

const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// Default package registry (used when config.packages is absent)
// ---------------------------------------------------------------------------

/** Default semantic packages loaded when no config overrides are present. */
export const DEFAULT_PACKAGES: readonly string[] = [
  "@canonical/design-system",
  "@canonical/anatomy-dsl",
  "@canonical/code-standards",
  "@canonical/pragma-cli",
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResolvedPackage {
  /** npm package name. */
  readonly pkg: string;
  /** Absolute path to the package root. */
  readonly dir: string;
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve packages to filesystem directories.
 *
 * When `refs` is provided, each PackageRef is resolved according to its kind.
 * When `refs` is omitted, the DEFAULT_PACKAGES are resolved via require.resolve.
 *
 * @param refs - Parsed package references (from config merge). Omit for defaults.
 * @returns Array of resolved packages with absolute directory paths.
 */
export function resolvePackages(
  refs?: ReadonlyArray<PackageRef>,
): ResolvedPackage[] {
  if (!refs) {
    return resolveNpmPackages(DEFAULT_PACKAGES);
  }

  const resolved: ResolvedPackage[] = [];

  for (const ref of refs) {
    switch (ref.kind) {
      case "file": {
        if (!existsSync(ref.path)) {
          console.warn(
            `pragma: package "${ref.pkg}" points to ${ref.path} which does not exist. Check the path or remove the file:// source.`,
          );
          break;
        }
        resolved.push({ pkg: ref.pkg, dir: ref.path });
        break;
      }

      case "git": {
        const cacheDir = gitCacheDir(ref.pkg, ref.ref);
        if (existsSync(cacheDir)) {
          resolved.push({ pkg: ref.pkg, dir: cacheDir });
          break;
        }
        // Cache miss — warn and fall through to npm
        console.warn(
          `pragma: git ref for "${ref.pkg}" not cached. Run "pragma update-refs" to fetch it.`,
        );
        resolveNpmFallback(ref.pkg, resolved);
        break;
      }

      case "npm": {
        resolveNpmFallback(ref.pkg, resolved);
        break;
      }
    }
  }

  return resolved;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve a list of package names via require.resolve. */
function resolveNpmPackages(pkgs: readonly string[]): ResolvedPackage[] {
  const resolved: ResolvedPackage[] = [];
  for (const pkg of pkgs) {
    resolveNpmFallback(pkg, resolved);
  }
  return resolved;
}

/** Try to resolve a single package via require.resolve, push if found. */
function resolveNpmFallback(
  pkg: string,
  resolved: ResolvedPackage[],
): void {
  try {
    resolved.push({
      pkg,
      dir: dirname(require.resolve(`${pkg}/package.json`)),
    });
  } catch {
    // package not installed — skip
  }
}
