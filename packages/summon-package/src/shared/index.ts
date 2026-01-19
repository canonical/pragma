/**
 * Shared utilities for package generator
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

// =============================================================================
// Types
// =============================================================================

export type PackageType = "tool-ts" | "library" | "css";

export type PackageManager = "bun" | "npm" | "yarn" | "pnpm";

export interface PackageAnswers {
  /** Full package name (e.g., @canonical/my-package or my-package) */
  name: string;
  /** Package type */
  type: PackageType;
  /** Package description */
  description: string;
  /** Include React dependencies */
  withReact: boolean;
  /** Include Storybook setup */
  withStorybook: boolean;
  /** Include CLI binary entry point */
  withCli: boolean;
  /** Run package manager install after creation */
  runInstall: boolean;
}

export interface MonorepoInfo {
  isMonorepo: boolean;
  version?: string;
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate npm package name
 * Supports scoped packages (@scope/name) and unscoped packages
 * Rules: lowercase, can contain hyphens, can't start/end with hyphen
 */
export const validatePackageName = (value: unknown): true | string => {
  if (!value || typeof value !== "string") {
    return "Package name is required";
  }

  // Extract the package name (handle scoped packages)
  const name = getPackageShortName(value);

  if (!/^[a-z][a-z0-9-]*[a-z0-9]$|^[a-z]$/.test(name)) {
    return "Package name must be lowercase, can contain hyphens, but cannot start or end with a hyphen";
  }

  if (value.length > 214) {
    return "Package name cannot be longer than 214 characters";
  }

  return true;
};

/**
 * Extract the short name from a package name (removes scope if present)
 * @canonical/my-package -> my-package
 * my-package -> my-package
 */
export const getPackageShortName = (fullName: string): string => {
  const match = fullName.match(/^@[^/]+\/(.+)$/);
  return match ? match[1] : fullName;
};

/**
 * Get the directory name for a package (short name, no scope)
 */
export const getPackageDir = (fullName: string): string => {
  return getPackageShortName(fullName);
};

// =============================================================================
// String Helpers
// =============================================================================

/**
 * Convert string to kebab-case
 */
export const kebabCase = (str: string): string => {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
};

/**
 * Convert string to PascalCase
 */
export const pascalCase = (str: string): string => {
  return str
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
};

// =============================================================================
// Detection Utilities
// =============================================================================

/**
 * Detect if running in a monorepo and get the version
 */
export const detectMonorepo = (cwd: string): Task<MonorepoInfo> => {
  // Look for lerna.json in parent directories
  const lernaPath = path.join(cwd, "lerna.json");
  const parentLernaPath = path.join(cwd, "..", "lerna.json");
  const grandparentLernaPath = path.join(cwd, "..", "..", "lerna.json");

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

/**
 * Detect the package manager in use
 */
export const detectPackageManager = (cwd: string): Task<PackageManager> => {
  const bunLock = path.join(cwd, "bun.lockb");
  const bunLock2 = path.join(cwd, "bun.lock");
  const yarnLock = path.join(cwd, "yarn.lock");
  const pnpmLock = path.join(cwd, "pnpm-lock.yaml");

  // Also check parent directories for monorepo setup
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
              pure("npm" as const),
            ),
          ),
        ),
      ),
    ),
  );
};

// =============================================================================
// Configuration Helpers
// =============================================================================

/**
 * Get the webarchitect ruleset based on package type and options
 */
export const getRuleset = (type: PackageType, withReact: boolean): string => {
  if (withReact) return "package-react";
  if (type === "css") return "base"; // CSS packages use base ruleset
  return type; // "tool-ts" or "library"
};

/**
 * Get license based on package type
 */
export const getLicense = (type: PackageType): string => {
  if (type === "tool-ts") return "GPL-3.0";
  return "LGPL-3.0"; // library and css use LGPL
};

/**
 * Get package entry points based on type
 */
export const getEntryPoints = (
  type: PackageType,
): {
  module: string;
  types: string | null;
  files: string[];
  needsBuild: boolean;
} => {
  if (type === "tool-ts") {
    return {
      module: "src/index.ts",
      types: "src/index.ts",
      files: ["src"],
      needsBuild: false,
    };
  }
  if (type === "css") {
    return {
      module: "src/index.css",
      types: null, // CSS packages don't have types
      files: ["src"],
      needsBuild: false,
    };
  }
  // library
  return {
    module: "dist/esm/index.js",
    types: "dist/types/index.d.ts",
    files: ["dist"],
    needsBuild: true,
  };
};

// =============================================================================
// Template Context
// =============================================================================

export interface TemplateContext {
  /** Package short name (without scope) */
  shortName: string;
  /** Full package name (as entered, e.g., @canonical/my-package) */
  name: string;
  /** Package description */
  description: string;
  /** Package type */
  type: PackageType;
  /** Package version */
  version: string;
  /** License */
  license: string;
  /** Module entry point */
  module: string;
  /** Types entry point (null for CSS packages) */
  types: string | null;
  /** Files to include */
  files: string[];
  /** Whether this package type needs a build step */
  needsBuild: boolean;
  /** Webarchitect ruleset */
  ruleset: string;
  /** Include React */
  withReact: boolean;
  /** Include Storybook */
  withStorybook: boolean;
  /** Include CLI */
  withCli: boolean;
  /** Monorepo version (if applicable) */
  monorepoVersion?: string;
  /** Generator name */
  generatorName: string;
  /** Generator version */
  generatorVersion: string;
  /** Index signature for EJS compatibility */
  [key: string]: unknown;
}

/**
 * Create template context from answers
 */
export const createTemplateContext = (
  answers: PackageAnswers,
  monorepoInfo: MonorepoInfo,
): TemplateContext => {
  const entryPoints = getEntryPoints(answers.type);
  const version = monorepoInfo.isMonorepo
    ? (monorepoInfo.version ?? "0.1.0")
    : "0.1.0";

  return {
    shortName: getPackageShortName(answers.name),
    name: answers.name,
    description: answers.description,
    type: answers.type,
    version,
    license: getLicense(answers.type),
    module: entryPoints.module,
    types: entryPoints.types,
    files: entryPoints.files,
    needsBuild: entryPoints.needsBuild,
    ruleset: getRuleset(answers.type, answers.withReact),
    withReact: answers.withReact,
    withStorybook: answers.withStorybook,
    withCli: answers.withCli,
    monorepoVersion: monorepoInfo.version,
    generatorName: "@canonical/summon-package",
    generatorVersion: "0.1.0",
  };
};
