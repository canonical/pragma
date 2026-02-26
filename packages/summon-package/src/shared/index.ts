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

export type ContentType = "typescript" | "css";

export type Framework = "react" | "none";

export interface PackageAnswers {
  /** Full package name (e.g., @canonical/my-package or my-package) */
  name: string;
  /** Package description */
  description: string;
  /** What does the package contain? */
  content: ContentType;
  /** Does it use a web framework? (only when content=typescript) */
  framework: Framework;
  /** Does it export UI components? (only when framework !== "none") */
  isComponentLibrary: boolean;
  /** Does it have a CLI entry point? (only when not a component library) */
  withCli: boolean;
  /** Run package manager install after creation */
  runInstall: boolean;
}

export interface MonorepoInfo {
  isMonorepo: boolean;
  version?: string;
}

export interface DerivedConfig {
  needsBuild: boolean;
  license: string;
  storybook: boolean;
  module: string;
  types: string | null;
  files: string[];
  ruleset: string;
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
// Derivation
// =============================================================================

/**
 * Derive all build/license/config decisions from the answer set.
 * Implements the decision tree derivation rules from the design doc.
 */
export const derivePackageConfig = (answers: PackageAnswers): DerivedConfig => {
  const isCSS = answers.content === "css";
  const hasCLI = answers.withCli;
  const isComponentLib = answers.isComponentLibrary;
  const hasFramework = answers.framework !== "none";

  const needsBuild = !isCSS && !hasCLI;
  const license = hasCLI && !isComponentLib ? "GPL-3.0" : "LGPL-3.0";
  const storybook = isComponentLib;

  const module_ = isCSS
    ? "src/index.css"
    : needsBuild
      ? "dist/esm/index.js"
      : "src/index.ts";

  const types = isCSS
    ? null
    : needsBuild
      ? "dist/types/index.d.ts"
      : "src/index.ts";

  const files = needsBuild ? ["dist"] : ["src"];

  const ruleset = isCSS
    ? "base"
    : hasFramework
      ? `package-${answers.framework}`
      : hasCLI
        ? "tool-ts"
        : "library";

  return {
    needsBuild,
    license,
    storybook,
    module: module_,
    types,
    files,
    ruleset,
  };
};

// =============================================================================
// Detection Utilities
// =============================================================================

/**
 * Detect if running in a monorepo and get the version
 */
export const detectMonorepo = (cwd: string): Task<MonorepoInfo> => {
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
export const detectPackageManager = (
  cwd: string,
): Task<"bun" | "npm" | "yarn" | "pnpm"> => {
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
};

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
 * Falls back to monorepo version, then "*".
 */
export const detectFrameworkVersion = (
  cwd: string,
  framework: Framework,
  monorepoInfo: MonorepoInfo,
): Task<string> => {
  const refPkg = FRAMEWORK_VERSION_PACKAGES[framework];

  if (!refPkg) {
    return pure(
      monorepoInfo.isMonorepo ? (monorepoInfo.version ?? "0.1.0") : "0.1.0",
    );
  }

  // Try to find the reference package's package.json in the monorepo
  // Convention: packages are at ../../{scope}/{name}/package.json relative to cwd
  const pkgName = refPkg.replace("@canonical/", "");
  // react-ds-global -> packages/react/ds-global
  const parts = pkgName.split("-");
  const framework_ = parts[0];
  const rest = parts.slice(1).join("-");
  const refPath = path.join(
    cwd,
    "..",
    "..",
    "packages",
    framework_,
    rest,
    "package.json",
  );

  return ifElseM(
    exists(refPath),
    flatMap(readFile(refPath), (content) => {
      const pkg = JSON.parse(content);
      return pure(pkg.version as string);
    }),
    pure(monorepoInfo.isMonorepo ? (monorepoInfo.version ?? "0.1.0") : "0.1.0"),
  );
};

// =============================================================================
// Template Context
// =============================================================================

export interface TemplateContext {
  /** Package short name (without scope) */
  shortName: string;
  /** Full package name */
  name: string;
  /** Package description */
  description: string;
  /** Content type (from answers) */
  content: ContentType;
  /** Framework (from answers) */
  framework: Framework;
  /** Whether it exports UI components (from answers) */
  isComponentLibrary: boolean;
  /** Whether it has a CLI (from answers) */
  withCli: boolean;
  /** Package version */
  version: string;
  /** License (derived) */
  license: string;
  /** Module entry point (derived) */
  module: string;
  /** Types entry point (derived, null for CSS) */
  types: string | null;
  /** Files to include in package (derived) */
  files: string[];
  /** Whether a build step is needed (derived) */
  needsBuild: boolean;
  /** Whether Storybook is included (derived) */
  storybook: boolean;
  /** Webarchitect ruleset (derived) */
  ruleset: string;
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
 * Create template context from answers and detected info
 */
export const createTemplateContext = (
  answers: PackageAnswers,
  version: string,
  monorepoVersion?: string,
): TemplateContext => {
  const config = derivePackageConfig(answers);

  return {
    shortName: getPackageShortName(answers.name),
    name: answers.name,
    description: answers.description,
    content: answers.content,
    framework: answers.framework,
    isComponentLibrary: answers.isComponentLibrary,
    withCli: answers.withCli,
    version,
    license: config.license,
    module: config.module,
    types: config.types,
    files: config.files,
    needsBuild: config.needsBuild,
    storybook: config.storybook,
    ruleset: config.ruleset,
    monorepoVersion,
    generatorName: "@canonical/summon-package",
    generatorVersion: "0.2.0",
  };
};
