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

export type PackageType = "tool-ts" | "library" | "react-library" | "css";

export type PackageManager = "bun" | "npm" | "yarn" | "pnpm";

export interface PackageAnswers {
  /** Full package name (e.g., @canonical/my-package or my-package) */
  name: string;
  /** Package type */
  type: PackageType;
  /** Package description */
  description: string;
  /** Include Storybook setup */
  withStorybook: boolean;
  /** Include CLI binary entry point (tool-ts only) */
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
              pure("bun" as const),
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
 * Get the webarchitect ruleset based on package type
 */
export const getRuleset = (type: PackageType): string => {
  if (type === "react-library") return "package-react";
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
  if (type === "react-library") {
    return {
      module: "dist/esm/index.js",
      types: "dist/types/index.d.ts",
      files: ["dist"],
      needsBuild: true,
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

/**
 * Get devDependencies for a package type.
 * Returned object is already sorted alphabetically and ready for JSON rendering.
 */
export const getDevDependencies = (
  type: PackageType,
  opts: { monorepoVersion: string | undefined; withStorybook: boolean },
): Record<string, string> => {
  const mv = opts.monorepoVersion ?? "0.1.0";

  if (type === "css") {
    return {
      "@biomejs/biome": "2.3.11",
      "@canonical/biome-config": mv,
    };
  }

  if (type === "react-library") {
    return {
      "@biomejs/biome": "2.3.11",
      "@canonical/biome-config": mv,
      "@canonical/typescript-config-react": mv,
      "@canonical/webarchitect": mv,
      "@testing-library/jest-dom": "^6.0.0",
      "@testing-library/react": "^16.0.0",
      "@types/react": "^19.0.0",
      "@types/react-dom": "^19.0.0",
      "@vitejs/plugin-react": "^4.0.0",
      ...(opts.withStorybook
        ? {
            "@canonical/storybook-config": mv,
            storybook: "^10.1.11",
            "@storybook/react": "^10.1.11",
          }
        : {}),
      react: "^19.0.0",
      "react-dom": "^19.0.0",
      copyfiles: "^2.4.1",
      jsdom: "^28.0.0",
      typescript: "^5.9.3",
      vite: "^7.3.1",
      "vite-tsconfig-paths": "^5.0.0",
      vitest: "^3.2.4",
    };
  }

  // tool-ts and library
  return {
    "@biomejs/biome": "2.3.11",
    "@canonical/biome-config": mv,
    "@canonical/typescript-config": mv,
    ...(opts.withStorybook
      ? {
          "@chromatic-com/storybook": "^5.0.0",
          "@canonical/storybook-config": mv,
          storybook: "^10.1.11",
        }
      : {}),
    "bun-types": "^1.0.0",
    typescript: "^5.9.3",
    vitest: "^3.2.4",
  };
};

/**
 * Get peerDependencies for a package type, or null if none apply.
 */
export const getPeerDependencies = (
  type: PackageType,
  opts: { monorepoVersion: string | undefined },
): Record<string, string> | null => {
  const mv = opts.monorepoVersion ?? "0.1.0";

  if (type === "react-library") {
    return {
      "@canonical/styles": mv,
      react: "^19.0.0",
      "react-dom": "^19.0.0",
    };
  }
  return null;
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
  /** Whether this is a React library (derived from type === "react-library") */
  withReact: boolean;
  /** Include Storybook */
  withStorybook: boolean;
  /** Include CLI */
  withCli: boolean;
  /** devDependencies for package.json */
  devDependencies: Record<string, string>;
  /** peerDependencies for package.json, or null if none */
  peerDependencies: Record<string, string> | null;
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
    ruleset: getRuleset(answers.type),
    withReact: answers.type === "react-library",
    withStorybook: answers.withStorybook,
    withCli: answers.withCli,
    devDependencies: getDevDependencies(answers.type, {
      monorepoVersion: monorepoInfo.version,
      withStorybook: answers.withStorybook,
    }),
    peerDependencies: getPeerDependencies(answers.type, {
      monorepoVersion: monorepoInfo.version,
    }),
    monorepoVersion: monorepoInfo.version,
    generatorName: "@canonical/summon-package",
    generatorVersion: "0.1.0",
  };
};
