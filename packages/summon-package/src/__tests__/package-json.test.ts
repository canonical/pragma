/**
 * Tests for programmatic package.json and biome.json builders
 */

import { describe, expect, it } from "vitest";
import type { TemplateContext } from "../shared/index.js";
import {
  applyCli,
  applyCssProfile,
  applyFrameworkDeps,
  applyStorybookConfig,
  applyTypeScriptProfile,
  buildBiomeJson,
  buildPackageJson,
  createBasePackage,
} from "../shared/package-json.js";
import type { VersionMap } from "../shared/versions.js";

// =============================================================================
// Mock version map (simulates resolved versions)
// =============================================================================

const mockVersions: VersionMap = {
  "@biomejs/biome": "2.3.11",
  "@canonical/biome-config": "0.15.0",
  "@canonical/storybook-config": "0.15.0",
  "@canonical/styles": "0.15.0",
  "@canonical/typescript-config": "0.15.0",
  "@canonical/typescript-config-react": "0.15.0",
  "@canonical/webarchitect": "0.15.0",
  "@storybook/addon-docs": "10.2.8",
  "@storybook/react-vite": "10.2.8",
  "@testing-library/jest-dom": "6.6.3",
  "@testing-library/react": "16.3.0",
  "@types/react": "19.0.0",
  "@types/react-dom": "19.0.0",
  "@vitejs/plugin-react": "4.5.2",
  "bun-types": "1.2.10",
  copyfiles: "2.4.1",
  jsdom: "26.1.0",
  react: "19.0.0",
  "react-dom": "19.0.0",
  storybook: "10.2.8",
  typescript: "5.8.3",
  vite: "6.3.5",
  "vite-tsconfig-paths": "5.1.4",
  vitest: "3.1.1",
};

// =============================================================================
// Helpers
// =============================================================================

const makeCtx = (
  overrides: Partial<TemplateContext> = {},
): TemplateContext => ({
  shortName: "test-pkg",
  name: "@canonical/test-pkg",
  description: "Test",
  content: "typescript",
  framework: "none",
  isComponentLibrary: false,
  withCli: false,
  version: "1.0.0",
  license: "LGPL-3.0",
  module: "dist/esm/index.js",
  types: "dist/types/index.d.ts",
  files: ["dist"],
  needsBuild: true,
  storybook: false,
  ruleset: "library",
  monorepoVersion: "1.0.0",
  generatorName: "@canonical/summon-package",
  generatorVersion: "0.2.0",
  ...overrides,
});

// =============================================================================
// createBasePackage
// =============================================================================

describe("createBasePackage", () => {
  it("creates base structure with all metadata", () => {
    const pkg = createBasePackage(
      "@canonical/test",
      "desc",
      "1.0.0",
      "LGPL-3.0",
    );
    expect(pkg.name).toBe("@canonical/test");
    expect(pkg.description).toBe("desc");
    expect(pkg.version).toBe("1.0.0");
    expect(pkg.license).toBe("LGPL-3.0");
    expect(pkg.type).toBe("module");
    expect(pkg.author.name).toBe("Canonical Webteam");
    expect(pkg.repository.url).toContain("pragma");
  });
});

// =============================================================================
// applyCssProfile
// =============================================================================

describe("applyCssProfile", () => {
  it("sets CSS entry point and scripts", () => {
    const pkg = createBasePackage("test", "", "1.0.0", "LGPL-3.0");
    applyCssProfile(pkg, mockVersions);

    expect(pkg.module).toBe("src/index.css");
    expect(pkg.files).toEqual(["src"]);
    expect(pkg.scripts.build).toBe("echo 'No build needed'");
    expect(pkg.scripts.test).toBe("echo 'No tests for CSS package'");
    expect(pkg.scripts["check:ts"]).toBeUndefined();
  });

  it("includes minimal devDependencies with resolved versions", () => {
    const pkg = createBasePackage("test", "", "1.0.0", "LGPL-3.0");
    applyCssProfile(pkg, mockVersions);

    expect(pkg.devDependencies["@biomejs/biome"]).toBe("2.3.11");
    expect(pkg.devDependencies["@canonical/biome-config"]).toBe("^0.15.0");
    expect(Object.keys(pkg.devDependencies)).not.toContain("typescript");
  });

  it("defaults to * when versions are not resolved", () => {
    const pkg = createBasePackage("test", "", "1.0.0", "LGPL-3.0");
    applyCssProfile(pkg, {});

    expect(pkg.devDependencies["@biomejs/biome"]).toBe("*");
  });
});

// =============================================================================
// applyTypeScriptProfile
// =============================================================================

describe("applyTypeScriptProfile", () => {
  it("sets build entry points when needsBuild is true", () => {
    const pkg = createBasePackage("test", "", "1.0.0", "LGPL-3.0");
    applyTypeScriptProfile(pkg, mockVersions, true, "library");

    expect(pkg.module).toBe("dist/esm/index.js");
    expect(pkg.types).toBe("dist/types/index.d.ts");
    expect(pkg.files).toEqual(["dist"]);
    expect(pkg.scripts.build).toBe("bun run build:package");
  });

  it("sets src entry points when needsBuild is false", () => {
    const pkg = createBasePackage("test", "", "1.0.0", "GPL-3.0");
    applyTypeScriptProfile(pkg, mockVersions, false, "tool-ts");

    expect(pkg.module).toBe("src/index.ts");
    expect(pkg.types).toBe("src/index.ts");
    expect(pkg.files).toEqual(["src"]);
    expect(pkg.scripts.build).toBe("echo 'No build needed'");
  });

  it("includes TS devDependencies with resolved versions", () => {
    const pkg = createBasePackage("test", "", "1.0.0", "LGPL-3.0");
    applyTypeScriptProfile(pkg, mockVersions, true, "library");

    expect(pkg.devDependencies.typescript).toBe("^5.8.3");
    expect(pkg.devDependencies.vitest).toBe("^3.1.1");
    expect(pkg.devDependencies["@canonical/webarchitect"]).toBe("^0.15.0");
  });
});

// =============================================================================
// applyFrameworkDeps
// =============================================================================

describe("applyFrameworkDeps", () => {
  it("adds React deps and peer deps with resolved versions", () => {
    const pkg = createBasePackage("test", "", "1.0.0", "LGPL-3.0");
    applyTypeScriptProfile(pkg, mockVersions, true, "package-react");
    applyFrameworkDeps(pkg, "react", mockVersions);

    expect(pkg.devDependencies.react).toBe("^19.0.0");
    expect(pkg.devDependencies["@types/react"]).toBe("^19.0.0");
    expect(pkg.devDependencies["@vitejs/plugin-react"]).toBe("^4.5.2");
    expect(pkg.devDependencies["@canonical/typescript-config-react"]).toBe(
      "^0.15.0",
    );
    // Base TS config should be replaced
    expect(Object.keys(pkg.devDependencies)).not.toContain(
      "@canonical/typescript-config",
    );
    expect(Object.keys(pkg.devDependencies)).not.toContain("bun-types");

    expect(pkg.peerDependencies).toBeDefined();
    expect(pkg.peerDependencies?.react).toBe("^19.0.0");
  });
});

// =============================================================================
// applyStorybookConfig
// =============================================================================

describe("applyStorybookConfig", () => {
  it("adds storybook deps and scripts with resolved versions", () => {
    const pkg = createBasePackage("test", "", "1.0.0", "LGPL-3.0");
    applyTypeScriptProfile(pkg, mockVersions, true, "package-react");
    applyStorybookConfig(pkg, "react", mockVersions);

    expect(pkg.devDependencies.storybook).toBe("^10.2.8");
    expect(pkg.devDependencies["@storybook/react-vite"]).toBe("^10.2.8");
    expect(pkg.devDependencies["@canonical/storybook-config"]).toBe("^0.15.0");
    expect(pkg.scripts.storybook).toBeDefined();
    expect(pkg.scripts["build:storybook"]).toBeDefined();
    expect(pkg.scripts["build:all"]).toContain("build:storybook");
  });
});

// =============================================================================
// applyCli
// =============================================================================

describe("applyCli", () => {
  it("adds bin field", () => {
    const pkg = createBasePackage("test", "", "1.0.0", "GPL-3.0");
    applyCli(pkg, "my-tool");

    expect(pkg.bin).toEqual({ "my-tool": "src/cli.ts" });
  });
});

// =============================================================================
// buildPackageJson — full integration per leaf
// =============================================================================

describe("buildPackageJson", () => {
  it("Leaf A: CSS package", () => {
    const pkg = buildPackageJson(
      makeCtx({
        content: "css",
        framework: "none",
        needsBuild: false,
        license: "LGPL-3.0",
        ruleset: "base",
        module: "src/index.css",
        types: null,
        files: ["src"],
      }),
      mockVersions,
    );

    expect(pkg.module).toBe("src/index.css");
    expect(pkg.types).toBeUndefined();
    expect(pkg.scripts.test).toContain("No tests");
  });

  it("Leaf C: React component library", () => {
    const pkg = buildPackageJson(
      makeCtx({
        content: "typescript",
        framework: "react",
        isComponentLibrary: true,
        storybook: true,
        needsBuild: true,
        license: "LGPL-3.0",
        ruleset: "package-react",
      }),
      mockVersions,
    );

    expect(pkg.module).toBe("dist/esm/index.js");
    expect(pkg.peerDependencies?.react).toBe("^19.0.0");
    expect(pkg.scripts.storybook).toBeDefined();
    expect(pkg.devDependencies.storybook).toBe("^10.2.8");
  });

  it("Leaf F: TS + none + CLI", () => {
    const pkg = buildPackageJson(
      makeCtx({
        content: "typescript",
        framework: "none",
        withCli: true,
        needsBuild: false,
        license: "GPL-3.0",
        ruleset: "tool-ts",
        module: "src/index.ts",
        types: "src/index.ts",
        files: ["src"],
      }),
      mockVersions,
    );

    expect(pkg.module).toBe("src/index.ts");
    expect(pkg.bin).toBeDefined();
    expect(pkg.license).toBe("GPL-3.0");
  });

  it("Leaf G: TS + none + no CLI (library)", () => {
    const pkg = buildPackageJson(
      makeCtx({
        content: "typescript",
        framework: "none",
        needsBuild: true,
        license: "LGPL-3.0",
        ruleset: "library",
      }),
      mockVersions,
    );

    expect(pkg.module).toBe("dist/esm/index.js");
    expect(pkg.bin).toBeUndefined();
    expect(pkg.scripts.build).toBe("bun run build:package");
  });

  it("devDependencies are sorted alphabetically", () => {
    const pkg = buildPackageJson(
      makeCtx({
        content: "typescript",
        framework: "react",
        isComponentLibrary: true,
        storybook: true,
        needsBuild: true,
      }),
      mockVersions,
    );

    const keys = Object.keys(pkg.devDependencies);
    const sorted = [...keys].sort();
    expect(keys).toEqual(sorted);
  });

  it("defaults all versions to * when no VersionMap provided", () => {
    const pkg = buildPackageJson(
      makeCtx({
        content: "typescript",
        framework: "react",
        isComponentLibrary: true,
        storybook: true,
        needsBuild: true,
        ruleset: "package-react",
      }),
    );

    expect(pkg.devDependencies.react).toBe("*");
    expect(pkg.peerDependencies?.react).toBe("*");
  });
});

// =============================================================================
// buildBiomeJson
// =============================================================================

describe("buildBiomeJson", () => {
  it("includes vite.config.ts for framework packages", () => {
    const biome = buildBiomeJson(
      makeCtx({ framework: "react", content: "typescript" }),
    );
    expect(biome.files.includes).toContain("vite.config.ts");
  });

  it("excludes vite.config.ts for non-framework packages", () => {
    const biome = buildBiomeJson(
      makeCtx({ framework: "none", content: "typescript" }),
    );
    expect(biome.files.includes).not.toContain("vite.config.ts");
  });

  it("excludes vite.config.ts for CSS packages", () => {
    const biome = buildBiomeJson(makeCtx({ content: "css" }));
    expect(biome.files.includes).not.toContain("vite.config.ts");
  });
});
