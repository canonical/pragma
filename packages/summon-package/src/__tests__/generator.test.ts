/**
 * Dry-run tests for the package generator — all 6 decision-tree leaves
 *
 * Leaf numbering follows tree depth:
 *
 *   content?
 *   ├── [1] css
 *   └── [2] typescript
 *       └── framework?
 *           ├── [2.1] react
 *           │   └── isComponentLibrary?
 *           │       ├── [2.1.1] component library + storybook
 *           │       └── [2.1.2] no components
 *           │           └── withCli?
 *           │               ├── [2.1.2.1] React CLI
 *           │               └── [2.1.2.2] React hooks/utils
 *           └── [2.2] none
 *               └── withCli?
 *                   ├── [2.2.1] CLI tool
 *                   └── [2.2.2] plain library
 */

import { dryRun } from "@canonical/summon";
import { describe, expect, it } from "vitest";
import generator from "../package/index.js";
import type { PackageAnswers } from "../shared/index.js";

// =============================================================================
// Helpers
// =============================================================================

const base: PackageAnswers = {
  name: "@canonical/test-pkg",
  description: "Test package",
  content: "typescript",
  framework: "none",
  isComponentLibrary: false,
  withCli: false,
  runInstall: false,
};

const getWritePaths = (answers: PackageAnswers): string[] => {
  const task = generator.generate(answers);
  const result = dryRun(task);
  return result.effects
    .filter((effect) => effect._tag === "WriteFile")
    .map((effect) => (effect as { path: string }).path);
};

const getMkdirPaths = (answers: PackageAnswers): string[] => {
  const task = generator.generate(answers);
  const result = dryRun(task);
  return result.effects
    .filter((effect) => effect._tag === "MakeDir")
    .map((effect) => (effect as { path: string }).path);
};

// =============================================================================
// Generator Metadata
// =============================================================================

describe("package generator", () => {
  it("has correct meta information", () => {
    expect(generator.meta.name).toBe("package");
    expect(generator.meta.version).toBe("0.2.0");
    expect(generator.meta.description).toBeDefined();
  });

  it("defines decision-tree prompts", () => {
    const promptNames = generator.prompts.map((prompt) => prompt.name);

    expect(promptNames).toContain("name");
    expect(promptNames).toContain("description");
    expect(promptNames).toContain("content");
    expect(promptNames).toContain("framework");
    expect(promptNames).toContain("isComponentLibrary");
    expect(promptNames).toContain("withCli");
    expect(promptNames).toContain("runInstall");

    // Old flat prompts should not exist
    expect(promptNames).not.toContain("type");
    expect(promptNames).not.toContain("withReact");
    expect(promptNames).not.toContain("withStorybook");
  });

  it("framework prompt is conditional on content=typescript", () => {
    const frameworkPrompt = generator.prompts.find(
      (prompt) => prompt.name === "framework",
    );
    expect(frameworkPrompt?.when).toBeDefined();
    expect(
      frameworkPrompt?.when?.({ content: "css" } as Record<string, unknown>),
    ).toBe(false);
    expect(
      frameworkPrompt?.when?.({ content: "typescript" } as Record<
        string,
        unknown
      >),
    ).toBe(true);
  });

  it("isComponentLibrary prompt is conditional on framework", () => {
    const prompt = generator.prompts.find(
      (prompt) => prompt.name === "isComponentLibrary",
    );
    expect(prompt?.when).toBeDefined();
    expect(
      prompt?.when?.({ content: "typescript", framework: "none" } as Record<
        string,
        unknown
      >),
    ).toBe(false);
    expect(
      prompt?.when?.({ content: "typescript", framework: "react" } as Record<
        string,
        unknown
      >),
    ).toBe(true);
  });

  it("withCli prompt is conditional on not being a component library", () => {
    const prompt = generator.prompts.find(
      (prompt) => prompt.name === "withCli",
    );
    expect(prompt?.when).toBeDefined();
    expect(
      prompt?.when?.({
        content: "typescript",
        isComponentLibrary: true,
      } as Record<string, unknown>),
    ).toBe(false);
    expect(
      prompt?.when?.({
        content: "typescript",
        isComponentLibrary: false,
      } as Record<string, unknown>),
    ).toBe(true);
  });
});

// =============================================================================
// Leaf 1: CSS
// =============================================================================

describe("Leaf 1: CSS package", () => {
  const answers: PackageAnswers = {
    ...base,
    content: "css",
    framework: "none",
  };

  it("generates CSS index file", () => {
    const paths = getWritePaths(answers);
    expect(paths.some((filePath) => filePath.endsWith("index.css"))).toBe(true);
  });

  it("generates common files", () => {
    const paths = getWritePaths(answers);
    expect(paths.some((filePath) => filePath.endsWith("package.json"))).toBe(
      true,
    );
    expect(paths.some((filePath) => filePath.endsWith("biome.json"))).toBe(
      true,
    );
    expect(paths.some((filePath) => filePath.endsWith("README.md"))).toBe(true);
  });

  it("does NOT generate TypeScript files", () => {
    const paths = getWritePaths(answers);
    expect(paths.some((filePath) => filePath.endsWith("index.ts"))).toBe(false);
    expect(paths.some((filePath) => filePath.endsWith("tsconfig.json"))).toBe(
      false,
    );
  });
});

// =============================================================================
// Leaf 2.1.1: TS + React + Component Library
// =============================================================================

describe("Leaf 2.1.1: React component library", () => {
  const answers: PackageAnswers = {
    ...base,
    framework: "react",
    isComponentLibrary: true,
  };

  it("generates React-specific files", () => {
    const paths = getWritePaths(answers);
    expect(paths.some((filePath) => filePath.endsWith("vite.config.ts"))).toBe(
      true,
    );
    expect(paths.some((filePath) => filePath.endsWith("vitest.setup.ts"))).toBe(
      true,
    );
    expect(paths.some((filePath) => filePath.endsWith("tsconfig.json"))).toBe(
      true,
    );
    expect(
      paths.some((filePath) => filePath.endsWith("tsconfig.build.json")),
    ).toBe(true);
  });

  it("generates Storybook files", () => {
    const paths = getWritePaths(answers);
    expect(
      paths.some((filePath) => filePath.includes(".storybook/main.ts")),
    ).toBe(true);
    expect(
      paths.some((filePath) => filePath.includes(".storybook/preview.ts")),
    ).toBe(true);
    expect(
      paths.some((filePath) => filePath.includes(".storybook/styles.css")),
    ).toBe(true);
  });

  it("creates React directory structure", () => {
    const dirs = getMkdirPaths(answers);
    expect(dirs.some((filePath) => filePath.endsWith("lib"))).toBe(true);
    expect(dirs.some((filePath) => filePath.endsWith("assets"))).toBe(true);
    expect(dirs.some((filePath) => filePath.endsWith(".storybook"))).toBe(true);
    expect(dirs.some((filePath) => filePath.endsWith("public"))).toBe(true);
  });

  it("does NOT generate CLI file", () => {
    const paths = getWritePaths(answers);
    expect(paths.some((filePath) => filePath.endsWith("cli.ts"))).toBe(false);
  });
});

// =============================================================================
// Leaf 2.1.2.1: TS + React + No Components + CLI
// =============================================================================

describe("Leaf 2.1.2.1: React + CLI (no components)", () => {
  const answers: PackageAnswers = {
    ...base,
    framework: "react",
    isComponentLibrary: false,
    withCli: true,
  };

  it("generates CLI file", () => {
    const paths = getWritePaths(answers);
    expect(paths.some((filePath) => filePath.endsWith("cli.ts"))).toBe(true);
  });

  it("generates React config files", () => {
    const paths = getWritePaths(answers);
    expect(paths.some((filePath) => filePath.endsWith("vite.config.ts"))).toBe(
      true,
    );
    expect(paths.some((filePath) => filePath.endsWith("tsconfig.json"))).toBe(
      true,
    );
  });

  it("does NOT generate Storybook files", () => {
    const paths = getWritePaths(answers);
    expect(paths.some((filePath) => filePath.includes(".storybook"))).toBe(
      false,
    );
  });
});

// =============================================================================
// Leaf 2.1.2.2: TS + React + No Components + No CLI
// =============================================================================

describe("Leaf 2.1.2.2: React hooks/utils (no components, no CLI)", () => {
  const answers: PackageAnswers = {
    ...base,
    framework: "react",
    isComponentLibrary: false,
    withCli: false,
  };

  it("generates React config files", () => {
    const paths = getWritePaths(answers);
    expect(paths.some((filePath) => filePath.endsWith("vite.config.ts"))).toBe(
      true,
    );
    expect(paths.some((filePath) => filePath.endsWith("tsconfig.json"))).toBe(
      true,
    );
    expect(
      paths.some((filePath) => filePath.endsWith("tsconfig.build.json")),
    ).toBe(true);
  });

  it("does NOT generate Storybook or CLI files", () => {
    const paths = getWritePaths(answers);
    expect(paths.some((filePath) => filePath.includes(".storybook"))).toBe(
      false,
    );
    expect(paths.some((filePath) => filePath.endsWith("cli.ts"))).toBe(false);
  });
});

// =============================================================================
// Leaf 2.2.1: TS + None + CLI
// =============================================================================

describe("Leaf 2.2.1: TypeScript CLI tool", () => {
  const answers: PackageAnswers = {
    ...base,
    framework: "none",
    withCli: true,
  };

  it("generates CLI file and index.ts", () => {
    const paths = getWritePaths(answers);
    expect(paths.some((filePath) => filePath.endsWith("cli.ts"))).toBe(true);
    expect(paths.some((filePath) => filePath.endsWith("index.ts"))).toBe(true);
  });

  it("generates plain tsconfig (not React)", () => {
    const paths = getWritePaths(answers);
    expect(paths.some((filePath) => filePath.endsWith("tsconfig.json"))).toBe(
      true,
    );
    expect(paths.some((filePath) => filePath.endsWith("vite.config.ts"))).toBe(
      false,
    );
  });

  it("does NOT generate Storybook files", () => {
    const paths = getWritePaths(answers);
    expect(paths.some((filePath) => filePath.includes(".storybook"))).toBe(
      false,
    );
  });
});

// =============================================================================
// Leaf 2.2.2: TS + None + No CLI (plain library)
// =============================================================================

describe("Leaf 2.2.2: Plain TypeScript library", () => {
  const answers: PackageAnswers = {
    ...base,
    framework: "none",
    withCli: false,
  };

  it("generates standard files", () => {
    const paths = getWritePaths(answers);
    expect(paths.some((filePath) => filePath.endsWith("package.json"))).toBe(
      true,
    );
    expect(paths.some((filePath) => filePath.endsWith("biome.json"))).toBe(
      true,
    );
    expect(paths.some((filePath) => filePath.endsWith("tsconfig.json"))).toBe(
      true,
    );
    expect(paths.some((filePath) => filePath.endsWith("index.ts"))).toBe(true);
    expect(paths.some((filePath) => filePath.endsWith("README.md"))).toBe(true);
  });

  it("does NOT generate CLI, Storybook, or React files", () => {
    const paths = getWritePaths(answers);
    expect(paths.some((filePath) => filePath.endsWith("cli.ts"))).toBe(false);
    expect(paths.some((filePath) => filePath.includes(".storybook"))).toBe(
      false,
    );
    expect(paths.some((filePath) => filePath.endsWith("vite.config.ts"))).toBe(
      false,
    );
  });

  it("creates directory structure using short name", () => {
    const dirs = getMkdirPaths(answers);
    expect(dirs.some((filePath) => filePath === "test-pkg")).toBe(true);
    expect(dirs.some((filePath) => filePath.endsWith("src"))).toBe(true);
  });
});
