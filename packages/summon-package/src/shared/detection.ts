/**
 * Environment detection utilities
 *
 * Functions that detect monorepo configuration, package manager,
 * and framework versions from the filesystem. All exports share
 * the same shape: (...args) => Task<T>.
 */

import * as path from "node:path";
import {
  exists,
  flatMap,
  ifElseM,
  pure,
  readFile,
  type Task,
} from "@canonical/summon";
import type { Framework, MonorepoInfo } from "./types.js";

// =============================================================================
// Monorepo Detection
// =============================================================================

/**
 * Detect if running in a monorepo and get the version.
 * @note This function is impure - it reads lerna.json from the filesystem
 * to determine monorepo status and version.
 */
export const detectMonorepo = (
  currentDirectory: string,
): Task<MonorepoInfo> => {
  const lernaPath = path.join(currentDirectory, "lerna.json");
  const parentLernaPath = path.join(currentDirectory, "..", "lerna.json");
  const grandparentLernaPath = path.join(
    currentDirectory,
    "..",
    "..",
    "lerna.json",
  );

  const parseLerna = (content: string): MonorepoInfo => {
    const lerna = JSON.parse(content);
    return { isMonorepo: true, version: lerna.version };
  };

  const notMonorepo: MonorepoInfo = { isMonorepo: false };

  return flatMap(exists(lernaPath), (hasLerna) => {
    if (hasLerna) {
      return flatMap(readFile(lernaPath), (content) =>
        pure(parseLerna(content)),
      );
    }
    return flatMap(exists(parentLernaPath), (hasParent) => {
      if (hasParent) {
        return flatMap(readFile(parentLernaPath), (content) =>
          pure(parseLerna(content)),
        );
      }
      return flatMap(exists(grandparentLernaPath), (hasGrandparent) => {
        if (hasGrandparent) {
          return flatMap(readFile(grandparentLernaPath), (content) =>
            pure(parseLerna(content)),
          );
        }
        return pure(notMonorepo);
      });
    });
  });
};

// =============================================================================
// Framework Version Detection
// =============================================================================

/**
 * Reference packages for framework-specific versioning.
 * Each framework's generated package version follows its reference package.
 */
const FRAMEWORK_VERSION_PACKAGES: Record<Framework, string | null> = {
  react: "@canonical/react-ds-global",
  none: null,
};

/**
 * Detect the version to use for a generated package based on framework.
 * React packages follow @canonical/react-ds-global versioning.
 * Falls back to monorepo version, then "0.1.0".
 * @note This function is impure - it reads the reference package's
 * package.json from the filesystem to determine the version.
 */
export const detectFrameworkVersion = (
  currentDirectory: string,
  framework: Framework,
  monorepoInfo: MonorepoInfo,
): Task<string> => {
  const referencePackage = FRAMEWORK_VERSION_PACKAGES[framework];

  if (!referencePackage) {
    return pure(
      monorepoInfo.isMonorepo ? (monorepoInfo.version ?? "0.1.0") : "0.1.0",
    );
  }

  // Try to find the reference package's package.json in the monorepo
  // Convention: packages are at ../../{scope}/{name}/package.json relative to currentDirectory
  const packageName = referencePackage.replace("@canonical/", "");
  // react-ds-global -> packages/react/ds-global
  const parts = packageName.split("-");
  const frameworkSegment = parts[0];
  const rest = parts.slice(1).join("-");
  const referencePath = path.join(
    currentDirectory,
    "..",
    "..",
    "packages",
    frameworkSegment,
    rest,
    "package.json",
  );

  return ifElseM(
    exists(referencePath),
    flatMap(readFile(referencePath), (content) => {
      const parsedPackage = JSON.parse(content);
      return pure(parsedPackage.version as string);
    }),
    pure(monorepoInfo.isMonorepo ? (monorepoInfo.version ?? "0.1.0") : "0.1.0"),
  );
};
