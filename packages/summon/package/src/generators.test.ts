/**
 * Tests for summon-package generator (dry-run)
 */

import { readFileSync } from "node:fs";
import { dryRun, dryRunWith, type Effect } from "@canonical/task";
import { describe, expect, it } from "vitest";
import { generator } from "./package/index.js";
import type { PackageAnswers } from "./shared/index.js";

/**
 * Mocks for rendered-output tests: ReadFile reads the real template from
 * disk so EJS renders actual content; Exists is false so monorepo detection
 * is deterministic (standalone, version fallback).
 */
const renderMocks = new Map<string, (effect: Effect) => unknown>([
  ["ReadFile", (e) => readFileSync((e as { path: string }).path, "utf-8")],
  ["Exists", () => false],
]);

/** Dry-run the generator and return the rendered package.json, parsed. */
const renderPackageJson = (answers: PackageAnswers) => {
  const result = dryRunWith(generator.generate(answers), renderMocks);
  const write = result.effects.find(
    (e): e is Extract<Effect, { _tag: "WriteFile" }> =>
      e._tag === "WriteFile" && e.path.endsWith("package.json"),
  );
  expect(write).toBeDefined();
  return JSON.parse((write as { content: string }).content);
};

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
      withPrTemplate: false,
      runInstall: false,
    };

    const task = generator.generate(answers);
    const result = dryRun(task);

    const writePaths = result.effects
      .filter((e) => e._tag === "WriteFile")
      .map((e) => (e as { path: string }).path);

    expect(writePaths.some((p) => p.endsWith("package.json"))).toBe(true);
    expect(writePaths.some((p) => p.endsWith("tsconfig.json"))).toBe(true);
    expect(writePaths.some((p) => p.endsWith("biome.json"))).toBe(true);
    expect(writePaths.some((p) => p.endsWith("index.ts"))).toBe(true);
    expect(writePaths.some((p) => p.endsWith("README.md"))).toBe(true);

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
      withPrTemplate: false,
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
      withPrTemplate: false,
      runInstall: false,
    };

    const task = generator.generate(answers);
    const result = dryRun(task);

    const writePaths = result.effects
      .filter((e) => e._tag === "WriteFile")
      .map((e) => (e as { path: string }).path);

    expect(writePaths.some((p) => p.endsWith("index.css"))).toBe(true);
    expect(writePaths.some((p) => p.endsWith("package.json"))).toBe(true);
    expect(writePaths.some((p) => p.endsWith("biome.json"))).toBe(true);
    expect(writePaths.some((p) => p.endsWith("README.md"))).toBe(true);

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
      withPrTemplate: false,
      runInstall: false,
    };

    const task = generator.generate(answers);
    const result = dryRun(task);

    const mkdirPaths = result.effects
      .filter((e) => e._tag === "MakeDir")
      .map((e) => (e as { path: string }).path);

    expect(mkdirPaths.some((p) => p === "my-pkg")).toBe(true);
    expect(mkdirPaths.some((p) => p.endsWith("src"))).toBe(true);
  });
});

describe("rendered package.json manifest (withReact)", () => {
  const reactAnswers = (
    type: PackageAnswers["type"],
    withStorybook: boolean,
  ): PackageAnswers => ({
    name: "@canonical/my-react-pkg",
    type,
    description: "React package",
    withReact: true,
    withStorybook,
    withCli: false,
    withPrTemplate: false,
    runInstall: false,
  });

  const combos: Array<[PackageAnswers["type"], boolean]> = [
    ["library", false],
    ["library", true],
    ["tool-ts", false],
    ["tool-ts", true],
  ];

  it.each(
    combos,
  )("type=%s withStorybook=%s satisfies the package-react-components contract", (type, withStorybook) => {
    const pkg = renderPackageJson(reactAnswers(type, withStorybook));

    // Explicit exports map: "." with types + import, "./package.json"
    expect(pkg.exports["."]).toBeDefined();
    expect(pkg.exports["."].types).toBeDefined();
    expect(pkg.exports["."].import).toBeDefined();
    expect(pkg.exports["./package.json"]).toBe("./package.json");

    // CSS-scoped sideEffects (package-react-components requires exactly this)
    expect(pkg.sideEffects).toEqual(["**/*.css"]);

    // react/react-dom are peers pinned to ^19, never dependencies
    expect(pkg.peerDependencies.react).toBe("^19.0.0");
    expect(pkg.peerDependencies["react-dom"]).toBe("^19.0.0");
    expect(pkg.dependencies?.react).toBeUndefined();
    expect(pkg.dependencies?.["react-dom"]).toBeUndefined();

    // devDependencies mirror the peers so workspace builds resolve React
    expect(pkg.devDependencies.react).toBe("^19.0.0");
    expect(pkg.devDependencies["react-dom"]).toBe("^19.0.0");

    // storybook-config is build-time only: devDependencies when storybook
    // is enabled, absent otherwise, never in dependencies
    expect(pkg.dependencies?.["@canonical/storybook-config"]).toBeUndefined();
    if (withStorybook) {
      expect(pkg.devDependencies["@canonical/storybook-config"]).toBeDefined();
    } else {
      expect(
        pkg.devDependencies["@canonical/storybook-config"],
      ).toBeUndefined();
    }

    // Bound to the ruleset that enforces all of the above
    expect(pkg.scripts["check:webarchitect"]).toBe(
      "webarchitect package-react-components",
    );
  });

  it("exports map points at the entry points for the package type", () => {
    const libPkg = renderPackageJson(reactAnswers("library", false));
    expect(libPkg.exports["."].types).toBe("./dist/types/index.d.ts");
    expect(libPkg.exports["."].import).toBe("./dist/esm/index.js");

    const toolPkg = renderPackageJson(reactAnswers("tool-ts", false));
    expect(toolPkg.exports["."].types).toBe("./src/index.ts");
    expect(toolPkg.exports["."].import).toBe("./src/index.ts");
  });

  it("non-react library omits exports/sideEffects and react deps", () => {
    const pkg = renderPackageJson({
      name: "@canonical/plain-lib",
      type: "library",
      description: "Plain library",
      withReact: false,
      withStorybook: false,
      withCli: false,
      withPrTemplate: false,
      runInstall: false,
    });

    expect(pkg.exports).toBeUndefined();
    expect(pkg.sideEffects).toBeUndefined();
    expect(pkg.peerDependencies).toBeUndefined();
    expect(pkg.devDependencies.react).toBeUndefined();
    expect(pkg.scripts["check:webarchitect"]).toBe("webarchitect library");
  });

  it("storybook without react renders valid JSON with storybook devDeps", () => {
    // Regression guard for the trailing-comma bug in the
    // storybook-without-react combination (JSON.parse throws on it)
    const pkg = renderPackageJson({
      name: "@canonical/sb-no-react",
      type: "library",
      description: "Storybook, no React",
      withReact: false,
      withStorybook: true,
      withCli: false,
      withPrTemplate: false,
      runInstall: false,
    });

    expect(pkg.devDependencies["@canonical/storybook-config"]).toBeDefined();
    expect(pkg.devDependencies.storybook).toBeDefined();
    expect(pkg.peerDependencies).toBeUndefined();
  });
});
