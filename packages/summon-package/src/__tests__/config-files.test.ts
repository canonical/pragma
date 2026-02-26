/**
 * Tests for programmatic JSON config file builders
 */

import { describe, expect, it } from "vitest";
import {
  buildTsconfigBuildJson,
  buildTsconfigJson,
} from "../shared/config-files.js";
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

// =============================================================================
// buildTsconfigJson
// =============================================================================

describe("buildTsconfigJson", () => {
  it("builds plain TS tsconfig for framework=none", () => {
    const content = buildTsconfigJson(makeCtx({ framework: "none" }));
    const tsconfig = JSON.parse(content);

    expect(tsconfig.extends).toBe("@canonical/typescript-config");
    expect(tsconfig.compilerOptions.types).toContain("bun-types");
    expect(tsconfig.include).toEqual(["src/**/*.ts"]);
  });

  it("builds React tsconfig for framework=react", () => {
    const content = buildTsconfigJson(makeCtx({ framework: "react" }));
    const tsconfig = JSON.parse(content);

    expect(tsconfig.extends).toBe("@canonical/typescript-config-react");
    expect(tsconfig.compilerOptions.types).toContain("react");
    expect(tsconfig.include).toContain("src/**/*.tsx");
    expect(tsconfig.include).toContain("vite.config.ts");
  });

  it("includes storybook paths when storybook=true", () => {
    const content = buildTsconfigJson(
      makeCtx({ framework: "react", storybook: true }),
    );
    const tsconfig = JSON.parse(content);

    expect(tsconfig.include).toContain(".storybook/*.ts");
    expect(tsconfig.include).toContain(".storybook/*.tsx");
  });

  it("excludes storybook paths when storybook=false", () => {
    const content = buildTsconfigJson(
      makeCtx({ framework: "react", storybook: false }),
    );
    const tsconfig = JSON.parse(content);

    expect(tsconfig.include).not.toContain(".storybook/*.ts");
  });
});

// =============================================================================
// buildTsconfigBuildJson
// =============================================================================

describe("buildTsconfigBuildJson", () => {
  it("returns null for framework=none", () => {
    expect(buildTsconfigBuildJson(makeCtx({ framework: "none" }))).toBeNull();
  });

  it("builds React build tsconfig", () => {
    const content = buildTsconfigBuildJson(makeCtx({ framework: "react" }));
    expect(content).not.toBeNull();
    const tsconfig = JSON.parse(content as string);

    expect(tsconfig.extends).toBe("./tsconfig.json");
    expect(tsconfig.compilerOptions.outDir).toBe("dist/esm");
    expect(tsconfig.compilerOptions.declarationDir).toBe("dist/types");
    expect(tsconfig.exclude).toContain("src/**/*.stories.tsx");
  });

  it("includes .storybook in exclude when storybook=true", () => {
    const content = buildTsconfigBuildJson(
      makeCtx({ framework: "react", storybook: true }),
    );
    const tsconfig = JSON.parse(content as string);

    expect(tsconfig.exclude).toContain(".storybook");
  });

  it("omits .storybook from exclude when storybook=false", () => {
    const content = buildTsconfigBuildJson(
      makeCtx({ framework: "react", storybook: false }),
    );
    const tsconfig = JSON.parse(content as string);

    expect(tsconfig.exclude).not.toContain(".storybook");
  });
});
