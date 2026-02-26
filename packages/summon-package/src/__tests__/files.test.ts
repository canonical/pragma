/**
 * Tests for file manifest collector
 */

import { describe, expect, it } from "vitest";
import { collectManifest } from "../package/files.js";
import type { TemplateContext } from "../shared/index.js";

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

const filePaths = (manifest: ReturnType<typeof collectManifest>): string[] =>
  manifest.files.map((f) => f.path);

const templateDests = (
  manifest: ReturnType<typeof collectManifest>,
): string[] => manifest.templates.map((t) => t.destPath);

// =============================================================================
// Directory structure
// =============================================================================

describe("collectManifest directories", () => {
  it("always creates package root and src", () => {
    const m = collectManifest(makeCtx(), "test-pkg");
    expect(m.dirs).toContain("test-pkg");
    expect(m.dirs.some((d) => d.endsWith("src"))).toBe(true);
  });

  it("creates lib and assets dirs for React", () => {
    const m = collectManifest(makeCtx({ framework: "react" }), "test-pkg");
    expect(m.dirs.some((d) => d.includes("lib"))).toBe(true);
    expect(m.dirs.some((d) => d.includes("assets"))).toBe(true);
  });

  it("creates .storybook and public for component libraries", () => {
    const m = collectManifest(
      makeCtx({ storybook: true, isComponentLibrary: true }),
      "test-pkg",
    );
    expect(m.dirs.some((d) => d.includes(".storybook"))).toBe(true);
    expect(m.dirs.some((d) => d.includes("public"))).toBe(true);
  });

  it("does NOT create .storybook for non-component packages", () => {
    const m = collectManifest(makeCtx({ storybook: false }), "test-pkg");
    expect(m.dirs.some((d) => d.includes(".storybook"))).toBe(false);
  });
});

// =============================================================================
// Programmatic JSON files
// =============================================================================

describe("collectManifest JSON files", () => {
  it("always generates package.json and biome.json", () => {
    const paths = filePaths(collectManifest(makeCtx(), "test-pkg"));
    expect(paths.some((p) => p.endsWith("package.json"))).toBe(true);
    expect(paths.some((p) => p.endsWith("biome.json"))).toBe(true);
  });

  it("generates tsconfig.json for TypeScript packages", () => {
    const paths = filePaths(
      collectManifest(makeCtx({ content: "typescript" }), "test-pkg"),
    );
    expect(paths.some((p) => p.endsWith("tsconfig.json"))).toBe(true);
  });

  it("does NOT generate tsconfig.json for CSS packages", () => {
    const paths = filePaths(
      collectManifest(makeCtx({ content: "css" }), "test-pkg"),
    );
    expect(paths.some((p) => p.endsWith("tsconfig.json"))).toBe(false);
  });

  it("generates tsconfig.build.json for React", () => {
    const paths = filePaths(
      collectManifest(makeCtx({ framework: "react" }), "test-pkg"),
    );
    expect(paths.some((p) => p.endsWith("tsconfig.build.json"))).toBe(true);
  });

  it("does NOT generate tsconfig.build.json for framework=none", () => {
    const paths = filePaths(
      collectManifest(makeCtx({ framework: "none" }), "test-pkg"),
    );
    expect(paths.some((p) => p.endsWith("tsconfig.build.json"))).toBe(false);
  });

  it("does NOT contain non-JSON files", () => {
    const paths = filePaths(
      collectManifest(
        makeCtx({ framework: "react", storybook: true }),
        "test-pkg",
      ),
    );
    for (const p of paths) {
      expect(p).toMatch(/\.json$/);
    }
  });
});

// =============================================================================
// EJS templates — decision tree layers
// =============================================================================

describe("collectManifest templates — _base layer", () => {
  it("always includes README", () => {
    const dests = templateDests(collectManifest(makeCtx(), "test-pkg"));
    expect(dests.some((p) => p.endsWith("README.md"))).toBe(true);
  });
});

describe("collectManifest templates — css layer", () => {
  it("includes index.css for CSS packages", () => {
    const dests = templateDests(
      collectManifest(makeCtx({ content: "css" }), "test-pkg"),
    );
    expect(dests.some((p) => p.endsWith("index.css"))).toBe(true);
    expect(dests.some((p) => p.endsWith("index.ts"))).toBe(false);
  });
});

describe("collectManifest templates — typescript layer", () => {
  it("includes index.ts for TypeScript packages", () => {
    const dests = templateDests(
      collectManifest(makeCtx({ content: "typescript" }), "test-pkg"),
    );
    expect(dests.some((p) => p.endsWith("index.ts"))).toBe(true);
    expect(dests.some((p) => p.endsWith("index.css"))).toBe(false);
  });
});

describe("collectManifest templates — framework/react layer", () => {
  it("includes vite + vitest for React", () => {
    const dests = templateDests(
      collectManifest(makeCtx({ framework: "react" }), "test-pkg"),
    );
    expect(dests.some((p) => p.endsWith("vite.config.ts"))).toBe(true);
    expect(dests.some((p) => p.endsWith("vitest.setup.ts"))).toBe(true);
  });

  it("does NOT include vite/vitest for framework=none", () => {
    const dests = templateDests(
      collectManifest(makeCtx({ framework: "none" }), "test-pkg"),
    );
    expect(dests.some((p) => p.endsWith("vite.config.ts"))).toBe(false);
    expect(dests.some((p) => p.endsWith("vitest.setup.ts"))).toBe(false);
  });
});

describe("collectManifest templates — component-library/react layer", () => {
  it("includes storybook files for React component libraries", () => {
    const dests = templateDests(
      collectManifest(
        makeCtx({
          framework: "react",
          storybook: true,
          isComponentLibrary: true,
        }),
        "test-pkg",
      ),
    );
    expect(dests.some((p) => p.includes(".storybook/main.ts"))).toBe(true);
    expect(dests.some((p) => p.includes(".storybook/preview.ts"))).toBe(true);
    expect(dests.some((p) => p.includes(".storybook/styles.css"))).toBe(true);
  });

  it("does NOT include storybook when storybook=false", () => {
    const dests = templateDests(
      collectManifest(makeCtx({ storybook: false }), "test-pkg"),
    );
    expect(dests.some((p) => p.includes(".storybook"))).toBe(false);
  });
});

describe("collectManifest templates — cli layer", () => {
  it("includes cli.ts when withCli=true", () => {
    const dests = templateDests(
      collectManifest(makeCtx({ withCli: true }), "test-pkg"),
    );
    expect(dests.some((p) => p.endsWith("cli.ts"))).toBe(true);
  });

  it("does NOT include cli.ts when withCli=false", () => {
    const dests = templateDests(
      collectManifest(makeCtx({ withCli: false }), "test-pkg"),
    );
    expect(dests.some((p) => p.endsWith("cli.ts"))).toBe(false);
  });
});

describe("collectManifest templates — general", () => {
  it("all template paths point to .ejs files", () => {
    const m = collectManifest(
      makeCtx({ framework: "react", storybook: true, withCli: true }),
      "test-pkg",
    );
    for (const t of m.templates) {
      expect(t.templatePath).toMatch(/\.ejs$/);
    }
  });
});
