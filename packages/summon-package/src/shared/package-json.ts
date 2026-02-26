/**
 * Programmatic package.json builder
 *
 * Builds package.json as a typed object instead of rendering an EJS template.
 * Each apply* function is a small, testable unit that adds a profile to the
 * base package. Scripts are extracted as named constants for readability.
 */

import type { Framework, TemplateContext } from "./index.js";
import { caret, exact, type VersionMap } from "./versions.js";

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

/** Resolved versions passed to all profile functions */
type ProfileOpts = VersionMap;

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

export const createBasePackage = (
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

export const applyCssProfile = (
  pkg: PackageJson,
  versions: ProfileOpts,
): void => {
  pkg.module = "src/index.css";
  pkg.files = ["src"];
  pkg.scripts = cssScripts;
  pkg.devDependencies = sortObject({
    "@biomejs/biome": exact(versions, "@biomejs/biome"),
    "@canonical/biome-config": caret(versions, "@canonical/biome-config"),
  });
};

export const applyTypeScriptProfile = (
  pkg: PackageJson,
  versions: ProfileOpts,
  needsBuild: boolean,
  ruleset: string,
): void => {
  // Entry points
  if (needsBuild) {
    pkg.module = "dist/esm/index.js";
    pkg.types = "dist/types/index.d.ts";
    pkg.files = ["dist"];
  } else {
    pkg.module = "src/index.ts";
    pkg.types = "src/index.ts";
    pkg.files = ["src"];
  }

  // Scripts
  pkg.scripts = typescriptScripts(needsBuild, ruleset);

  // Dependencies
  pkg.devDependencies = sortObject({
    ...pkg.devDependencies,
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

export const applyFrameworkDeps = (
  pkg: PackageJson,
  framework: Framework,
  versions: ProfileOpts,
): void => {
  if (framework === "react") {
    // Replace base TS config with React-specific config
    delete pkg.devDependencies["@canonical/typescript-config"];
    delete pkg.devDependencies["bun-types"];

    pkg.devDependencies = sortObject({
      ...pkg.devDependencies,
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

    pkg.peerDependencies = sortObject({
      "@canonical/styles": caret(versions, "@canonical/styles"),
      react: caret(versions, "react"),
      "react-dom": caret(versions, "react-dom"),
    });
  }
};

export const applyStorybookConfig = (
  pkg: PackageJson,
  framework: Framework,
  versions: ProfileOpts,
): void => {
  pkg.devDependencies = sortObject({
    ...pkg.devDependencies,
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

  pkg.scripts = { ...pkg.scripts, ...storybookScripts };
};

export const applyCli = (pkg: PackageJson, shortName: string): void => {
  pkg.bin = { [shortName]: "src/cli.ts" };
};

// =============================================================================
// Orchestrator
// =============================================================================

/**
 * Build a complete package.json object from the template context.
 * Uses resolved versions from the registry when available, defaults to "*".
 */
export const buildPackageJson = (
  ctx: TemplateContext,
  versions: VersionMap = {},
): PackageJson => {
  const pkg = createBasePackage(
    ctx.name,
    ctx.description,
    ctx.version,
    ctx.license,
  );

  if (ctx.content === "css") {
    applyCssProfile(pkg, versions);
  } else {
    applyTypeScriptProfile(pkg, versions, ctx.needsBuild, ctx.ruleset);

    if (ctx.framework !== "none") {
      applyFrameworkDeps(pkg, ctx.framework, versions);
    }

    if (ctx.storybook) {
      applyStorybookConfig(pkg, ctx.framework, versions);
    }

    if (ctx.withCli) {
      applyCli(pkg, ctx.shortName);
    }
  }

  return pkg;
};

/**
 * Build a formatted package.json string.
 */
export const buildPackageJsonString = (
  ctx: TemplateContext,
  versions: VersionMap = {},
): string => {
  return `${JSON.stringify(buildPackageJson(ctx, versions), null, 2)}\n`;
};

// =============================================================================
// Biome.json builder
// =============================================================================

interface BiomeJson {
  extends: string[];
  files: { includes: string[] };
}

export const buildBiomeJson = (ctx: TemplateContext): BiomeJson => {
  const includes = ["src", "*.json"];

  if (ctx.framework !== "none" && ctx.content !== "css") {
    includes.splice(1, 0, "vite.config.ts");
  }

  return {
    extends: ["@canonical/biome-config"],
    files: { includes },
  };
};

/**
 * Build a formatted biome.json string.
 */
export const buildBiomeJsonString = (ctx: TemplateContext): string => {
  return `${JSON.stringify(buildBiomeJson(ctx), null, 2)}\n`;
};

// =============================================================================
// Helpers
// =============================================================================

const sortObject = (obj: Record<string, string>): Record<string, string> => {
  return Object.fromEntries(
    Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)),
  );
};
