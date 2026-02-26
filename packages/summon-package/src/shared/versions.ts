/**
 * Package version resolution utilities
 *
 * Resolves dependency versions by fetching the source package from the npm
 * registry (e.g. @canonical/react-ds-global for React) and extracting its
 * declared dependency versions. One fetch per generator run.
 */

import { exec, flatMap, pure, type Task } from "@canonical/summon";
import type { Framework } from "./index.js";

// =============================================================================
// Types
// =============================================================================

/** Map of package name → resolved version (exact, e.g. "19.2.4") */
export type VersionMap = Record<string, string>;

// =============================================================================
// Source package mapping
// =============================================================================

/**
 * The reference package for each framework. Its published dependencies
 * define the version ecosystem for generated packages of that framework.
 */
const SOURCE_PACKAGES: Record<Framework, string | null> = {
  react: "@canonical/react-ds-global",
  none: null,
};

// =============================================================================
// Resolution
// =============================================================================

/**
 * Fetch dependency versions from the framework's source package on npm.
 *
 * For React, fetches @canonical/react-ds-global and extracts all its
 * dependencies/peerDependencies. For "none" or CSS, returns an empty map
 * (all versions default to "*").
 *
 * Tries npm first, falls back to curl if npm is unavailable.
 */
export const fetchSourceVersions = (framework: Framework): Task<VersionMap> => {
  const sourcePackage = SOURCE_PACKAGES[framework];
  if (!sourcePackage) return pure({});

  return flatMap(
    exec("npm", ["view", sourcePackage, "--json"]),
    (npmResult) => {
      if (npmResult.exitCode === 0) {
        return pure(parseRegistryPackage(npmResult.stdout));
      }
      return flatMap(
        exec("curl", [
          "-s",
          `https://registry.npmjs.org/${sourcePackage}/latest`,
        ]),
        (curlResult) =>
          pure(
            curlResult.exitCode === 0
              ? parseRegistryPackage(curlResult.stdout)
              : {},
          ),
      );
    },
  );
};

/**
 * Parse a registry JSON response and extract all dependency versions.
 * Merges dependencies, devDependencies, and peerDependencies.
 */
const parseRegistryPackage = (json: string): VersionMap => {
  try {
    const pkg = JSON.parse(json);
    const versions: VersionMap = {};

    for (const deps of [
      pkg.dependencies,
      pkg.devDependencies,
      pkg.peerDependencies,
    ]) {
      if (deps) {
        for (const [name, version] of Object.entries(deps)) {
          if (typeof version === "string" && version !== "*") {
            versions[name] = stripRangePrefix(version);
          }
        }
      }
    }

    return versions;
  } catch {
    return {};
  }
};

/**
 * Strip semver range prefixes: ^, ~, >=, >, <=, <, =
 * "^19.0.0" → "19.0.0", "~5.8.3" → "5.8.3", "2.3.11" → "2.3.11"
 */
const stripRangePrefix = (version: string): string =>
  version.replace(/^[~^>=<]+/, "");

// =============================================================================
// Version formatting helpers
// =============================================================================

/**
 * Format a resolved version as a caret range.
 * "19.2.4" → "^19.2.4", "*" → "*"
 */
export const caret = (versions: VersionMap, pkg: string): string => {
  const v = versions[pkg];
  return v && v !== "*" ? `^${v}` : "*";
};

/**
 * Format a resolved version as an exact pin.
 * "2.3.14" → "2.3.14", "*" → "*"
 */
export const exact = (versions: VersionMap, pkg: string): string => {
  return versions[pkg] ?? "*";
};
