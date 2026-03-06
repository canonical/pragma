/**
 * Tests for file manifest collector
 */

import { describe, expect, it } from "vitest";
import { collectManifest } from "../package/files.js";
import type { TemplateContext } from "../shared/index.js";

// =============================================================================
// Helpers
// =============================================================================

const makeContext = (
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

const filePaths = (manifest: ReturnType<typeof collectManifest>): string[] =>
  manifest.files.map((file) => file.path);

const templateDests = (
  manifest: ReturnType<typeof collectManifest>,
): string[] => manifest.templates.map((templateFile) => templateFile.destPath);

// =============================================================================
// Directory structure
// =============================================================================

describe("collectManifest directories", () => {
  it("always creates package root and src", () => {
    const manifest = collectManifest(makeContext(), "test-pkg");
    expect(manifest.dirs).toContain("test-pkg");
    expect(manifest.dirs.some((directory) => directory.endsWith("src"))).toBe(
      true,
    );
  });

  it("creates lib and assets dirs for React", () => {
    const manifest = collectManifest(
      makeContext({ framework: "react" }),
      "test-pkg",
    );
    expect(manifest.dirs.some((directory) => directory.includes("lib"))).toBe(
      true,
    );
    expect(
      manifest.dirs.some((directory) => directory.includes("assets")),
    ).toBe(true);
  });

  it("creates .storybook and public for component libraries", () => {
    const manifest = collectManifest(
      makeContext({ storybook: true, isComponentLibrary: true }),
      "test-pkg",
    );
    expect(
      manifest.dirs.some((directory) => directory.includes(".storybook")),
    ).toBe(true);
    expect(
      manifest.dirs.some((directory) => directory.includes("public")),
    ).toBe(true);
  });

  it("does NOT create .storybook for non-component packages", () => {
    const manifest = collectManifest(
      makeContext({ storybook: false }),
      "test-pkg",
    );
    expect(
      manifest.dirs.some((directory) => directory.includes(".storybook")),
    ).toBe(false);
  });
});

// =============================================================================
// Programmatic JSON files
// =============================================================================

describe("collectManifest JSON files", () => {
  it("always generates package.json and biome.json", () => {
    const paths = filePaths(collectManifest(makeContext(), "test-pkg"));
    expect(paths.some((filePath) => filePath.endsWith("package.json"))).toBe(
      true,
    );
    expect(paths.some((filePath) => filePath.endsWith("biome.json"))).toBe(
      true,
    );
  });

  it("generates tsconfig.json for TypeScript packages", () => {
    const paths = filePaths(
      collectManifest(makeContext({ content: "typescript" }), "test-pkg"),
    );
    expect(paths.some((filePath) => filePath.endsWith("tsconfig.json"))).toBe(
      true,
    );
  });

  it("does NOT generate tsconfig.json for CSS packages", () => {
    const paths = filePaths(
      collectManifest(makeContext({ content: "css" }), "test-pkg"),
    );
    expect(paths.some((filePath) => filePath.endsWith("tsconfig.json"))).toBe(
      false,
    );
  });

  it("generates tsconfig.build.json for React", () => {
    const paths = filePaths(
      collectManifest(makeContext({ framework: "react" }), "test-pkg"),
    );
    expect(
      paths.some((filePath) => filePath.endsWith("tsconfig.build.json")),
    ).toBe(true);
  });

  it("does NOT generate tsconfig.build.json for framework=none", () => {
    const paths = filePaths(
      collectManifest(makeContext({ framework: "none" }), "test-pkg"),
    );
    expect(
      paths.some((filePath) => filePath.endsWith("tsconfig.build.json")),
    ).toBe(false);
  });

  it("does NOT contain non-JSON files", () => {
    const paths = filePaths(
      collectManifest(
        makeContext({ framework: "react", storybook: true }),
        "test-pkg",
      ),
    );
    for (const filePath of paths) {
      expect(filePath).toMatch(/\.json$/);
    }
  });
});

// =============================================================================
// EJS templates — decision tree layers
// =============================================================================

describe("collectManifest templates — _base layer", () => {
  it("always includes README", () => {
    const dests = templateDests(collectManifest(makeContext(), "test-pkg"));
    expect(dests.some((filePath) => filePath.endsWith("README.md"))).toBe(true);
  });
});

describe("collectManifest templates — css layer", () => {
  it("includes index.css for CSS packages", () => {
    const dests = templateDests(
      collectManifest(makeContext({ content: "css" }), "test-pkg"),
    );
    expect(dests.some((filePath) => filePath.endsWith("index.css"))).toBe(true);
    expect(dests.some((filePath) => filePath.endsWith("index.ts"))).toBe(false);
  });
});

describe("collectManifest templates — typescript layer", () => {
  it("includes index.ts for TypeScript packages", () => {
    const dests = templateDests(
      collectManifest(makeContext({ content: "typescript" }), "test-pkg"),
    );
    expect(dests.some((filePath) => filePath.endsWith("index.ts"))).toBe(true);
    expect(dests.some((filePath) => filePath.endsWith("index.css"))).toBe(
      false,
    );
  });
});

describe("collectManifest templates — framework/react layer", () => {
  it("includes vite + vitest for React", () => {
    const dests = templateDests(
      collectManifest(makeContext({ framework: "react" }), "test-pkg"),
    );
    expect(dests.some((filePath) => filePath.endsWith("vite.config.ts"))).toBe(
      true,
    );
    expect(dests.some((filePath) => filePath.endsWith("vitest.setup.ts"))).toBe(
      true,
    );
  });

  it("does NOT include vite/vitest for framework=none", () => {
    const dests = templateDests(
      collectManifest(makeContext({ framework: "none" }), "test-pkg"),
    );
    expect(dests.some((filePath) => filePath.endsWith("vite.config.ts"))).toBe(
      false,
    );
    expect(dests.some((filePath) => filePath.endsWith("vitest.setup.ts"))).toBe(
      false,
    );
  });
});

describe("collectManifest templates — component-library/react layer", () => {
  it("includes storybook files for React component libraries", () => {
    const dests = templateDests(
      collectManifest(
        makeContext({
          framework: "react",
          storybook: true,
          isComponentLibrary: true,
        }),
        "test-pkg",
      ),
    );
    expect(
      dests.some((filePath) => filePath.includes(".storybook/main.ts")),
    ).toBe(true);
    expect(
      dests.some((filePath) => filePath.includes(".storybook/preview.ts")),
    ).toBe(true);
    expect(
      dests.some((filePath) => filePath.includes(".storybook/styles.css")),
    ).toBe(true);
  });

  it("does NOT include storybook when storybook=false", () => {
    const dests = templateDests(
      collectManifest(makeContext({ storybook: false }), "test-pkg"),
    );
    expect(dests.some((filePath) => filePath.includes(".storybook"))).toBe(
      false,
    );
  });
});

describe("collectManifest templates — cli layer", () => {
  it("includes cli.ts when withCli=true", () => {
    const dests = templateDests(
      collectManifest(makeContext({ withCli: true }), "test-pkg"),
    );
    expect(dests.some((filePath) => filePath.endsWith("cli.ts"))).toBe(true);
  });

  it("does NOT include cli.ts when withCli=false", () => {
    const dests = templateDests(
      collectManifest(makeContext({ withCli: false }), "test-pkg"),
    );
    expect(dests.some((filePath) => filePath.endsWith("cli.ts"))).toBe(false);
  });
});

describe("collectManifest templates — general", () => {
  it("all template paths point to .ejs files", () => {
    const manifest = collectManifest(
      makeContext({ framework: "react", storybook: true, withCli: true }),
      "test-pkg",
    );
    for (const templateFile of manifest.templates) {
      expect(templateFile.templatePath).toMatch(/\.ejs$/);
    }
  });
});
