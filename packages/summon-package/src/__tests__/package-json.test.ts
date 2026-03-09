/**
 * Tests for programmatic package.json and biome.json builders
 *
 * Tests exercise the public API (buildPackageJson, buildBiomeJsonString)
 * through the decision-tree leaf paths. Internal profile functions
 * (applyCssProfile, applyFrameworkDeps, etc.) are tested indirectly.
 */

import { describe, expect, it } from "vitest";
import {
  buildBiomeJsonString,
  buildPackageJson,
} from "../shared/config/index.js";
import type { TemplateContext, VersionMap } from "../shared/types.js";

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

const makeContext = (
  overrides: Partial<TemplateContext> = {},
): TemplateContext => ({
  shortName: "test-packageJson",
  name: "@canonical/test-packageJson",
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
// buildPackageJson — all decision-tree leaves
// =============================================================================

describe("buildPackageJson", () => {
  it("Leaf 1: CSS package", () => {
    const packageJson = buildPackageJson(
      makeContext({
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

    expect(packageJson.module).toBe("src/index.css");
    expect(packageJson.types).toBeUndefined();
    expect(packageJson.files).toEqual(["src"]);
    expect(packageJson.scripts.build).toBe("echo 'No build needed'");
    expect(packageJson.scripts.test).toContain("No tests");
    expect(packageJson.scripts["check:ts"]).toBeUndefined();

    // CSS devDependencies: biome only
    expect(packageJson.devDependencies["@biomejs/biome"]).toBe("2.3.11");
    expect(packageJson.devDependencies["@canonical/biome-config"]).toBe(
      "^0.15.0",
    );
    expect(Object.keys(packageJson.devDependencies)).not.toContain(
      "typescript",
    );
  });

  it("Leaf 2.1.1: React component library", () => {
    const packageJson = buildPackageJson(
      makeContext({
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

    expect(packageJson.module).toBe("dist/esm/index.js");
    expect(packageJson.types).toBe("dist/types/index.d.ts");
    expect(packageJson.files).toEqual(["dist"]);
    expect(packageJson.scripts.build).toBe("bun run build:package");

    // React deps
    expect(packageJson.devDependencies.react).toBe("^19.0.0");
    expect(packageJson.devDependencies["@types/react"]).toBe("^19.0.0");
    expect(packageJson.devDependencies["@vitejs/plugin-react"]).toBe("^4.5.2");
    expect(
      packageJson.devDependencies["@canonical/typescript-config-react"],
    ).toBe("^0.15.0");
    // Base TS config replaced by React config
    expect(Object.keys(packageJson.devDependencies)).not.toContain(
      "@canonical/typescript-config",
    );
    expect(Object.keys(packageJson.devDependencies)).not.toContain("bun-types");

    // Peer deps
    expect(packageJson.peerDependencies?.react).toBe("^19.0.0");

    // Storybook
    expect(packageJson.devDependencies.storybook).toBe("^10.2.8");
    expect(packageJson.devDependencies["@storybook/react-vite"]).toBe(
      "^10.2.8",
    );
    expect(packageJson.devDependencies["@canonical/storybook-config"]).toBe(
      "^0.15.0",
    );
    expect(packageJson.scripts.storybook).toBeDefined();
    expect(packageJson.scripts["build:storybook"]).toBeDefined();
    expect(packageJson.scripts["build:all"]).toContain("build:storybook");
  });

  it("Leaf 2.2.1: TS + none + CLI", () => {
    const packageJson = buildPackageJson(
      makeContext({
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

    expect(packageJson.module).toBe("src/index.ts");
    expect(packageJson.bin).toBeDefined();
    expect(packageJson.license).toBe("GPL-3.0");

    // TS devDependencies
    expect(packageJson.devDependencies.typescript).toBe("^5.8.3");
    expect(packageJson.devDependencies.vitest).toBe("^3.1.1");
    expect(packageJson.devDependencies["@canonical/webarchitect"]).toBe(
      "^0.15.0",
    );
  });

  it("Leaf 2.2.2: TS + none + no CLI (library)", () => {
    const packageJson = buildPackageJson(
      makeContext({
        content: "typescript",
        framework: "none",
        needsBuild: true,
        license: "LGPL-3.0",
        ruleset: "library",
      }),
      mockVersions,
    );

    expect(packageJson.module).toBe("dist/esm/index.js");
    expect(packageJson.types).toBe("dist/types/index.d.ts");
    expect(packageJson.files).toEqual(["dist"]);
    expect(packageJson.bin).toBeUndefined();
    expect(packageJson.scripts.build).toBe("bun run build:package");
  });

  it("sets src entry points when needsBuild is false", () => {
    const packageJson = buildPackageJson(
      makeContext({
        content: "typescript",
        framework: "none",
        needsBuild: false,
        ruleset: "tool-ts",
      }),
      mockVersions,
    );

    expect(packageJson.module).toBe("src/index.ts");
    expect(packageJson.types).toBe("src/index.ts");
    expect(packageJson.files).toEqual(["src"]);
    expect(packageJson.scripts.build).toBe("echo 'No build needed'");
  });

  it("devDependencies are sorted alphabetically", () => {
    const packageJson = buildPackageJson(
      makeContext({
        content: "typescript",
        framework: "react",
        isComponentLibrary: true,
        storybook: true,
        needsBuild: true,
      }),
      mockVersions,
    );

    const keys = Object.keys(packageJson.devDependencies);
    const sorted = [...keys].sort();
    expect(keys).toEqual(sorted);
  });

  it("defaults all versions to * when no VersionMap provided", () => {
    const packageJson = buildPackageJson(
      makeContext({
        content: "typescript",
        framework: "react",
        isComponentLibrary: true,
        storybook: true,
        needsBuild: true,
        ruleset: "package-react",
      }),
    );

    expect(packageJson.devDependencies.react).toBe("*");
    expect(packageJson.peerDependencies?.react).toBe("*");
  });

  it("defaults to * when versions are not resolved", () => {
    const packageJson = buildPackageJson(makeContext({ content: "css" }), {});

    expect(packageJson.devDependencies["@biomejs/biome"]).toBe("*");
  });

  it("creates base structure with all metadata", () => {
    const packageJson = buildPackageJson(
      makeContext({
        name: "@canonical/test",
        description: "desc",
        version: "1.0.0",
        license: "LGPL-3.0",
      }),
      mockVersions,
    );

    expect(packageJson.name).toBe("@canonical/test");
    expect(packageJson.description).toBe("desc");
    expect(packageJson.version).toBe("1.0.0");
    expect(packageJson.license).toBe("LGPL-3.0");
    expect(packageJson.type).toBe("module");
    expect(packageJson.author.name).toBe("Canonical Webteam");
    expect(packageJson.repository.url).toContain("pragma");
  });
});

// =============================================================================
// buildBiomeJsonString
// =============================================================================

describe("buildBiomeJsonString", () => {
  it("includes vite.config.ts for framework packages", () => {
    const biome = JSON.parse(
      buildBiomeJsonString(
        makeContext({ framework: "react", content: "typescript" }),
      ),
    );
    expect(biome.files.includes).toContain("vite.config.ts");
  });

  it("excludes vite.config.ts for non-framework packages", () => {
    const biome = JSON.parse(
      buildBiomeJsonString(
        makeContext({ framework: "none", content: "typescript" }),
      ),
    );
    expect(biome.files.includes).not.toContain("vite.config.ts");
  });

  it("excludes vite.config.ts for CSS packages", () => {
    const biome = JSON.parse(
      buildBiomeJsonString(makeContext({ content: "css" })),
    );
    expect(biome.files.includes).not.toContain("vite.config.ts");
  });
});
