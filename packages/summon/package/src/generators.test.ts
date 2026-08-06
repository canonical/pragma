/**
 * Tests for summon-package generator (dry-run)
 */

import { readFileSync } from "node:fs";
import { renderString } from "@canonical/summon-core";
import { dryRun } from "@canonical/task";
import { describe, expect, it } from "vitest";
import pkg from "../package.json" with { type: "json" };
import { generator } from "./package/index.js";
import {
  createTemplateContext,
  type MonorepoInfo,
  type PackageAnswers,
} from "./shared/index.js";

interface Manifest {
  main?: string;
  module?: string;
  types?: string;
  exports?: unknown;
  scripts: Record<string, string>;
  devDependencies: Record<string, string>;
}

/** Render the package.json template the way the generator does, and parse it. */
const renderManifest = (
  answers: PackageAnswers,
  monorepoInfo: MonorepoInfo = { isMonorepo: false },
): Manifest => {
  const source = readFileSync(
    new URL("./templates/package.json.ejs", import.meta.url),
    "utf-8",
  );
  return JSON.parse(
    renderString(source, createTemplateContext(answers, monorepoInfo)),
  );
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
    expect(writePaths.some((p) => p.endsWith("tsconfig.build.json"))).toBe(
      false,
    );
  });

  it("generates tsconfig.build.json for library package", () => {
    const answers: PackageAnswers = {
      name: "@canonical/my-lib",
      type: "library",
      description: "My library",
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

    expect(writePaths.some((p) => p.endsWith("tsconfig.build.json"))).toBe(
      true,
    );
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

describe("generated manifest", () => {
  const libraryAnswers: PackageAnswers = {
    name: "@canonical/my-lib",
    type: "library",
    description: "My library",
    withReact: false,
    withStorybook: false,
    withCli: false,
    withPrTemplate: false,
    runInstall: false,
  };

  it("declares main for a library, so summon can discover the package", () => {
    // `processPackage` in @canonical/summon-core reads `main` and returns
    // early when it is absent; `module` and `types` are never consulted.
    expect(renderManifest(libraryAnswers).main).toBe("dist/esm/index.js");
  });

  it("declares module, types and an exports map for a library", () => {
    const manifest = renderManifest(libraryAnswers);

    expect(manifest.module).toBe("dist/esm/index.js");
    expect(manifest.types).toBe("dist/types/index.d.ts");
    expect(manifest.exports).toEqual({
      ".": {
        types: "./dist/types/index.d.ts",
        import: "./dist/esm/index.js",
      },
    });
  });

  it("builds a library with the tsconfig the generator emits", () => {
    expect(renderManifest(libraryAnswers).scripts.build).toBe(
      "tsc -p tsconfig.build.json",
    );
  });

  it("ranges @canonical/* dependencies on the generator's own version", () => {
    // The host repository's version says nothing about which versions of
    // @canonical/* exist on npm, so it must not leak into the ranges.
    const manifest = renderManifest(libraryAnswers, {
      isMonorepo: true,
      version: "0.0.1",
    });

    expect(manifest.devDependencies["@canonical/biome-config"]).toBe(
      `^${pkg.version}`,
    );
    expect(manifest.devDependencies["@canonical/typescript-config"]).toBe(
      `^${pkg.version}`,
    );
  });
});
