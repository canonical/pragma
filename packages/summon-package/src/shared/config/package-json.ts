/**
 * Programmatic package.json builder
 *
 * Builds package.json as a typed object instead of rendering an EJS template.
 * Each apply* function is a small, single-purpose unit that adds a profile to
 * the base package. Scripts are extracted as named constants for readability.
 */

import type { Framework, TemplateContext, VersionMap } from "../types.js";

// =============================================================================
// Types
// =============================================================================

interface PackageJson {
  name: string;
  description: string;
  version: string;
  type: string;
  module?: string;
  types?: string;
  bin?: Record<string, string>;
  files: string[];
  author: { email: string; name: string };
  repository: { type: string; url: string };
  license: string;
  bugs: { url: string };
  homepage: string;
  scripts: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

// =============================================================================
// Version formatting
// =============================================================================

/**
 * Format a resolved version as a caret range.
 * "19.2.4" → "^19.2.4", "*" → "*"
 */
const caret = (versions: VersionMap, packageName: string): string => {
  const version = versions[packageName];
  return version && version !== "*" ? `^${version}` : "*";
};

/**
 * Format a resolved version as an exact pin.
 * "2.3.14" → "2.3.14", "*" → "*"
 */
const exact = (versions: VersionMap, packageName: string): string => {
  return versions[packageName] ?? "*";
};

// =============================================================================
// Scripts
// =============================================================================

const biomeScripts = {
  "check:biome": "biome check",
  "check:biome:fix": "biome check --write",
};

const cssScripts = {
  build: "echo 'No build needed'",
  "build:all": "bun run build",
  check: "bun run check:biome && bun run check:webarchitect",
  "check:fix": "bun run check:biome:fix",
  ...biomeScripts,
  "check:webarchitect": "webarchitect base",
  test: "echo 'No tests for CSS package'",
};

const typescriptScripts = (
  needsBuild: boolean,
  ruleset: string,
): Record<string, string> => ({
  build: needsBuild ? "bun run build:package" : "echo 'No build needed'",
  ...(needsBuild && {
    "build:package":
      "bun run build:package:tsc && bun run build:package:copycss",
    "build:package:tsc": "tsc -p tsconfig.build.json",
    "build:package:copycss": "copyfiles -u 1 'src/lib/{,**/}*.css' dist/esm",
  }),
  "build:all": "bun run build",
  check:
    "bun run check:biome && bun run check:ts && bun run check:webarchitect",
  "check:fix": "bun run check:biome:fix && bun run check:ts",
  ...biomeScripts,
  "check:ts": "tsc --noEmit",
  "check:webarchitect": `webarchitect ${ruleset}`,
  test: "vitest run",
});

const storybookScripts = {
  "build:all": "bun run build && bun run build:storybook",
  "build:storybook": "storybook build",
  storybook: "storybook dev -p 6006 --no-open --host 0.0.0.0",
};

// =============================================================================
// Base
// =============================================================================

const createBasePackage = (
  name: string,
  description: string,
  version: string,
  license: string,
): PackageJson => ({
  name,
  description,
  version,
  type: "module",
  files: [],
  author: {
    email: "webteam@canonical.com",
    name: "Canonical Webteam",
  },
  repository: {
    type: "git",
    url: "https://github.com/canonical/pragma",
  },
  license,
  bugs: {
    url: "https://github.com/canonical/pragma/issues",
  },
  homepage: "https://github.com/canonical/pragma#readme",
  scripts: {},
  devDependencies: {},
});

// =============================================================================
// Profiles
// =============================================================================

/**
 * Apply CSS package profile to a base package.json object.
 * @note This function is impure - it mutates the input package object
 * to set CSS-specific entry points, scripts, and dependencies.
 */
const applyCssProfile = (
  packageJson: PackageJson,
  versions: VersionMap,
): void => {
  packageJson.module = "src/index.css";
  packageJson.files = ["src"];
  packageJson.scripts = cssScripts;
  packageJson.devDependencies = sortObject({
    "@biomejs/biome": exact(versions, "@biomejs/biome"),
    "@canonical/biome-config": caret(versions, "@canonical/biome-config"),
  });
};

/**
 * Apply TypeScript package profile to a base package.json object.
 * @note This function is impure - it mutates the input package object
 * to set TypeScript-specific entry points, scripts, and dependencies.
 */
const applyTypeScriptProfile = (
  packageJson: PackageJson,
  versions: VersionMap,
  needsBuild: boolean,
  ruleset: string,
): void => {
  // Entry points
  if (needsBuild) {
    packageJson.module = "dist/esm/index.js";
    packageJson.types = "dist/types/index.d.ts";
    packageJson.files = ["dist"];
  } else {
    packageJson.module = "src/index.ts";
    packageJson.types = "src/index.ts";
    packageJson.files = ["src"];
  }

  // Scripts
  packageJson.scripts = typescriptScripts(needsBuild, ruleset);

  // Dependencies
  packageJson.devDependencies = sortObject({
    ...packageJson.devDependencies,
    "@biomejs/biome": exact(versions, "@biomejs/biome"),
    "@canonical/biome-config": caret(versions, "@canonical/biome-config"),
    "@canonical/typescript-config": caret(
      versions,
      "@canonical/typescript-config",
    ),
    "@canonical/webarchitect": caret(versions, "@canonical/webarchitect"),
    "bun-types": caret(versions, "bun-types"),
    typescript: caret(versions, "typescript"),
    vitest: caret(versions, "vitest"),
  });
};

/**
 * Apply framework-specific dependencies to a package.json object.
 * @note This function is impure - it mutates the input package object
 * to replace base TS config with framework-specific dependencies.
 */
const applyFrameworkDeps = (
  packageJson: PackageJson,
  framework: Framework,
  versions: VersionMap,
): void => {
  if (framework === "react") {
    // Replace base TS config with React-specific config
    delete packageJson.devDependencies["@canonical/typescript-config"];
    delete packageJson.devDependencies["bun-types"];

    packageJson.devDependencies = sortObject({
      ...packageJson.devDependencies,
      "@canonical/typescript-config-react": caret(
        versions,
        "@canonical/typescript-config-react",
      ),
      "@testing-library/jest-dom": caret(versions, "@testing-library/jest-dom"),
      "@testing-library/react": caret(versions, "@testing-library/react"),
      "@types/react": caret(versions, "@types/react"),
      "@types/react-dom": caret(versions, "@types/react-dom"),
      "@vitejs/plugin-react": caret(versions, "@vitejs/plugin-react"),
      copyfiles: caret(versions, "copyfiles"),
      jsdom: caret(versions, "jsdom"),
      react: caret(versions, "react"),
      "react-dom": caret(versions, "react-dom"),
      vite: caret(versions, "vite"),
      "vite-tsconfig-paths": caret(versions, "vite-tsconfig-paths"),
    });

    packageJson.peerDependencies = sortObject({
      "@canonical/styles": caret(versions, "@canonical/styles"),
      react: caret(versions, "react"),
      "react-dom": caret(versions, "react-dom"),
    });
  }
};

/**
 * Apply Storybook configuration to a package.json object.
 * @note This function is impure - it mutates the input package object
 * to add Storybook dependencies and scripts.
 */
const applyStorybookConfig = (
  packageJson: PackageJson,
  framework: Framework,
  versions: VersionMap,
): void => {
  packageJson.devDependencies = sortObject({
    ...packageJson.devDependencies,
    "@canonical/storybook-config": caret(
      versions,
      "@canonical/storybook-config",
    ),
    "@storybook/addon-docs": caret(versions, "@storybook/addon-docs"),
    [`@storybook/${framework}-vite`]: caret(
      versions,
      `@storybook/${framework}-vite`,
    ),
    storybook: caret(versions, "storybook"),
  });

  packageJson.scripts = { ...packageJson.scripts, ...storybookScripts };
};

/**
 * Apply CLI entry point to a package.json object.
 * @note This function is impure - it mutates the input package object
 * to add the bin field for CLI entry point.
 */
const applyCli = (packageJson: PackageJson, shortName: string): void => {
  packageJson.bin = { [shortName]: "src/cli.ts" };
};

// =============================================================================
// Orchestrator
// =============================================================================

/**
 * Build a complete package.json object from the template context.
 * Uses resolved versions from the registry when available, defaults to "*".
 */
export const buildPackageJson = (
  context: TemplateContext,
  versions: VersionMap = {},
): PackageJson => {
  const packageJson = createBasePackage(
    context.name,
    context.description,
    context.version,
    context.license,
  );

  if (context.content === "css") {
    applyCssProfile(packageJson, versions);
  } else {
    applyTypeScriptProfile(
      packageJson,
      versions,
      context.needsBuild,
      context.ruleset,
    );

    if (context.framework !== "none") {
      applyFrameworkDeps(packageJson, context.framework, versions);
    }

    if (context.storybook) {
      applyStorybookConfig(packageJson, context.framework, versions);
    }

    if (context.withCli) {
      applyCli(packageJson, context.shortName);
    }
  }

  return packageJson;
};

/**
 * Build a formatted package.json string.
 */
export const buildPackageJsonString = (
  context: TemplateContext,
  versions: VersionMap = {},
): string => {
  return `${JSON.stringify(buildPackageJson(context, versions), null, 2)}\n`;
};

// =============================================================================
// Helpers
// =============================================================================

const sortObject = (object: Record<string, string>): Record<string, string> => {
  return Object.fromEntries(
    Object.entries(object).sort(([a], [b]) => a.localeCompare(b)),
  );
};
