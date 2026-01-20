/**
 * Tests for summon-package generator
 */

import { dryRun } from "@canonical/summon";
import { describe, expect, it } from "vitest";
import { generator } from "../package/index.js";
import {
  createTemplateContext,
  getEntryPoints,
  getLicense,
  getRuleset,
  type MonorepoInfo,
  type PackageAnswers,
  validatePackageName,
} from "../shared/index.js";

// =============================================================================
// Shared Utilities Tests
// =============================================================================

describe("validatePackageName", () => {
  it("accepts valid package names", () => {
    expect(validatePackageName("my-package")).toBe(true);
    expect(validatePackageName("package")).toBe(true);
    expect(validatePackageName("my-cool-package")).toBe(true);
    expect(validatePackageName("pkg123")).toBe(true);
    expect(validatePackageName("a")).toBe(true);
  });

  it("rejects invalid package names", () => {
    expect(validatePackageName("")).not.toBe(true);
    expect(validatePackageName("-package")).not.toBe(true);
    expect(validatePackageName("package-")).not.toBe(true);
    expect(validatePackageName("My-Package")).not.toBe(true);
    expect(validatePackageName("my_package")).not.toBe(true);
  });

  it("strips @canonical/ prefix for validation", () => {
    expect(validatePackageName("@canonical/my-package")).toBe(true);
  });
});

describe("getLicense", () => {
  it("returns GPL-3.0 for tool-ts", () => {
    expect(getLicense("tool-ts")).toBe("GPL-3.0");
  });

  it("returns LGPL-3.0 for library", () => {
    expect(getLicense("library")).toBe("LGPL-3.0");
  });

  it("returns LGPL-3.0 for css", () => {
    expect(getLicense("css")).toBe("LGPL-3.0");
  });
});

describe("getEntryPoints", () => {
  it("returns src/ paths for tool-ts", () => {
    const entry = getEntryPoints("tool-ts");
    expect(entry.module).toBe("src/index.ts");
    expect(entry.types).toBe("src/index.ts");
    expect(entry.files).toContain("src");
    expect(entry.needsBuild).toBe(false);
  });

  it("returns dist/ paths for library", () => {
    const entry = getEntryPoints("library");
    expect(entry.module).toBe("dist/esm/index.js");
    expect(entry.types).toBe("dist/types/index.d.ts");
    expect(entry.files).toContain("dist");
    expect(entry.needsBuild).toBe(true);
  });

  it("returns src/index.css for css packages", () => {
    const entry = getEntryPoints("css");
    expect(entry.module).toBe("src/index.css");
    expect(entry.types).toBeNull();
    expect(entry.files).toContain("src");
    expect(entry.needsBuild).toBe(false);
  });
});

describe("getRuleset", () => {
  it("returns package-react when withReact is true", () => {
    expect(getRuleset("tool-ts", true)).toBe("package-react");
    expect(getRuleset("library", true)).toBe("package-react");
  });

  it("returns package type when withReact is false", () => {
    expect(getRuleset("tool-ts", false)).toBe("tool-ts");
    expect(getRuleset("library", false)).toBe("library");
  });

  it("returns base for css packages", () => {
    expect(getRuleset("css", false)).toBe("base");
  });
});

describe("createTemplateContext", () => {
  const baseAnswers: PackageAnswers = {
    name: "@canonical/test-pkg",
    type: "tool-ts",
    description: "Test package",
    withReact: false,
    withStorybook: false,
    withCli: false,
    runInstall: false,
  };

  it("creates context with monorepo version", () => {
    const monorepoInfo: MonorepoInfo = { isMonorepo: true, version: "1.2.3" };
    const ctx = createTemplateContext(baseAnswers, monorepoInfo);

    expect(ctx.name).toBe("@canonical/test-pkg");
    expect(ctx.shortName).toBe("test-pkg");
    expect(ctx.version).toBe("1.2.3");
    expect(ctx.license).toBe("GPL-3.0");
  });

  it("creates context with default version when not in monorepo", () => {
    const monorepoInfo: MonorepoInfo = { isMonorepo: false };
    const ctx = createTemplateContext(baseAnswers, monorepoInfo);

    expect(ctx.version).toBe("0.1.0");
  });

  it("handles unscoped package names", () => {
    const unscopedAnswers: PackageAnswers = {
      ...baseAnswers,
      name: "my-package",
    };
    const monorepoInfo: MonorepoInfo = { isMonorepo: false };
    const ctx = createTemplateContext(unscopedAnswers, monorepoInfo);

    expect(ctx.name).toBe("my-package");
    expect(ctx.shortName).toBe("my-package");
  });

  it("sets correct entry points for tool-ts", () => {
    const monorepoInfo: MonorepoInfo = { isMonorepo: false };
    const ctx = createTemplateContext(baseAnswers, monorepoInfo);

    expect(ctx.module).toBe("src/index.ts");
    expect(ctx.types).toBe("src/index.ts");
    expect(ctx.needsBuild).toBe(false);
  });

  it("sets correct entry points for library", () => {
    const answers: PackageAnswers = { ...baseAnswers, type: "library" };
    const monorepoInfo: MonorepoInfo = { isMonorepo: false };
    const ctx = createTemplateContext(answers, monorepoInfo);

    expect(ctx.module).toBe("dist/esm/index.js");
    expect(ctx.types).toBe("dist/types/index.d.ts");
    expect(ctx.license).toBe("LGPL-3.0");
    expect(ctx.needsBuild).toBe(true);
  });

  it("sets correct entry points for css", () => {
    const answers: PackageAnswers = { ...baseAnswers, type: "css" };
    const monorepoInfo: MonorepoInfo = { isMonorepo: false };
    const ctx = createTemplateContext(answers, monorepoInfo);

    expect(ctx.module).toBe("src/index.css");
    expect(ctx.types).toBeNull();
    expect(ctx.license).toBe("LGPL-3.0");
    expect(ctx.needsBuild).toBe(false);
  });
});

// =============================================================================
// Generator Dry-Run Tests
// =============================================================================

describe("package generator", () => {
  it("has correct meta information", () => {
    expect(generator.meta.name).toBe("package");
    expect(generator.meta.version).toBe("0.1.0");
    expect(generator.meta.description).toBeDefined();
  });

  it("defines required prompts", () => {
    const promptNames = generator.prompts.map((p) => p.name);

    expect(promptNames).toContain("name");
    expect(promptNames).toContain("type");
    expect(promptNames).toContain("description");
    expect(promptNames).toContain("withReact");
    expect(promptNames).toContain("withCli");
    expect(promptNames).toContain("runInstall");
  });

  it("generates expected files for tool-ts package", () => {
    const answers: PackageAnswers = {
      name: "@canonical/my-tool",
      type: "tool-ts",
      description: "My tool",
      withReact: false,
      withStorybook: false,
      withCli: false,
      runInstall: false,
    };

    const task = generator.generate(answers);
    const result = dryRun(task);

    const writePaths = result.effects
      .filter((e) => e._tag === "WriteFile")
      .map((e) => (e as { path: string }).path);

    // Check core files are created
    expect(writePaths.some((p) => p.endsWith("package.json"))).toBe(true);
    expect(writePaths.some((p) => p.endsWith("tsconfig.json"))).toBe(true);
    expect(writePaths.some((p) => p.endsWith("biome.json"))).toBe(true);
    expect(writePaths.some((p) => p.endsWith("index.ts"))).toBe(true);
    expect(writePaths.some((p) => p.endsWith("README.md"))).toBe(true);

    // Check CLI is NOT created when withCli is false
    expect(writePaths.some((p) => p.endsWith("cli.ts"))).toBe(false);
  });

  it("generates CLI file when withCli is true", () => {
    const answers: PackageAnswers = {
      name: "@canonical/my-cli",
      type: "tool-ts",
      description: "My CLI",
      withReact: false,
      withStorybook: false,
      withCli: true,
      runInstall: false,
    };

    const task = generator.generate(answers);
    const result = dryRun(task);

    const writePaths = result.effects
      .filter((e) => e._tag === "WriteFile")
      .map((e) => (e as { path: string }).path);

    expect(writePaths.some((p) => p.endsWith("cli.ts"))).toBe(true);
  });

  it("generates CSS package with index.css", () => {
    const answers: PackageAnswers = {
      name: "@canonical/my-styles",
      type: "css",
      description: "My styles",
      withReact: false,
      withStorybook: false,
      withCli: false,
      runInstall: false,
    };

    const task = generator.generate(answers);
    const result = dryRun(task);

    const writePaths = result.effects
      .filter((e) => e._tag === "WriteFile")
      .map((e) => (e as { path: string }).path);

    // Check CSS-specific files
    expect(writePaths.some((p) => p.endsWith("index.css"))).toBe(true);
    expect(writePaths.some((p) => p.endsWith("package.json"))).toBe(true);
    expect(writePaths.some((p) => p.endsWith("biome.json"))).toBe(true);
    expect(writePaths.some((p) => p.endsWith("README.md"))).toBe(true);

    // Check no TypeScript files for CSS package
    expect(writePaths.some((p) => p.endsWith("index.ts"))).toBe(false);
    expect(writePaths.some((p) => p.endsWith("tsconfig.json"))).toBe(false);
  });

  it("creates directory structure using short name", () => {
    const answers: PackageAnswers = {
      name: "@canonical/my-pkg",
      type: "tool-ts",
      description: "",
      withReact: false,
      withStorybook: false,
      withCli: false,
      runInstall: false,
    };

    const task = generator.generate(answers);
    const result = dryRun(task);

    const mkdirPaths = result.effects
      .filter((e) => e._tag === "MakeDir")
      .map((e) => (e as { path: string }).path);

    // Directory should be the short name (without scope)
    expect(mkdirPaths.some((p) => p === "my-pkg")).toBe(true);
    expect(mkdirPaths.some((p) => p.endsWith("src"))).toBe(true);
  });
});
