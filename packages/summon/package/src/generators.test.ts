/**
 * Tests for summon-package generator (dry-run)
 */

import { dryRun } from "@canonical/task";
import { describe, expect, it } from "vitest";
import { generator } from "./package/index.js";
import type { PackageAnswers } from "./shared/index.js";

const baseAnswers: PackageAnswers = {
  name: "@canonical/my-tool",
  type: "tool-ts",
  description: "My tool",
  framework: "none",
  withStorybook: false,
  withCli: false,
  withPrTemplate: false,
  runInstall: false,
};

function writePaths(answers: PackageAnswers): string[] {
  const result = dryRun(generator.generate(answers));
  return result.effects
    .filter((e) => e._tag === "WriteFile")
    .map((e) => (e as { path: string }).path);
}

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
    expect(promptNames).toContain("framework");
    expect(promptNames).toContain("withCli");
    expect(promptNames).toContain("runInstall");
    expect(promptNames).not.toContain("withReact");
  });

  it("generates expected files for tool-ts package", () => {
    const paths = writePaths(baseAnswers);

    expect(paths.some((p) => p.endsWith("package.json"))).toBe(true);
    expect(paths.some((p) => p.endsWith("tsconfig.json"))).toBe(true);
    expect(paths.some((p) => p.endsWith("biome.json"))).toBe(true);
    expect(paths.some((p) => p.endsWith("index.ts"))).toBe(true);
    expect(paths.some((p) => p.endsWith("index.test.ts"))).toBe(true);
    expect(paths.some((p) => p.endsWith("README.md"))).toBe(true);

    expect(paths.some((p) => p.endsWith("cli.ts"))).toBe(false);
  });

  it("generates CLI file when withCli is true", () => {
    const paths = writePaths({ ...baseAnswers, withCli: true });
    expect(paths.some((p) => p.endsWith("cli.ts"))).toBe(true);
  });

  it("generates CSS package with index.css", () => {
    const paths = writePaths({
      ...baseAnswers,
      name: "@canonical/my-styles",
      type: "css",
    });

    expect(paths.some((p) => p.endsWith("index.css"))).toBe(true);
    expect(paths.some((p) => p.endsWith("package.json"))).toBe(true);
    expect(paths.some((p) => p.endsWith("biome.json"))).toBe(true);
    expect(paths.some((p) => p.endsWith("README.md"))).toBe(true);

    expect(paths.some((p) => p.endsWith("index.ts"))).toBe(false);
    expect(paths.some((p) => p.endsWith("tsconfig.json"))).toBe(false);
  });

  it("generates a plain library with a build config and barrel test", () => {
    const paths = writePaths({
      ...baseAnswers,
      name: "@canonical/my-lib",
      type: "library",
      framework: "none",
    });

    expect(paths.some((p) => p.endsWith("tsconfig.build.json"))).toBe(true);
    expect(paths.some((p) => p.endsWith("index.test.ts"))).toBe(true);
  });

  it("generates a react component library", () => {
    const paths = writePaths({
      ...baseAnswers,
      name: "@canonical/my-react-lib",
      type: "library",
      framework: "react",
    });

    expect(paths.some((p) => p.endsWith("vitest.config.ts"))).toBe(true);
    expect(paths.some((p) => p.endsWith("vitest.setup.ts"))).toBe(true);
    expect(paths.some((p) => p.endsWith("tsconfig.build.json"))).toBe(true);
    expect(paths.some((p) => p.endsWith(`${"Example"}/Example.tsx`))).toBe(
      true,
    );
    expect(paths.some((p) => p.endsWith("Example.test.tsx"))).toBe(true);
  });

  it("generates a svelte component library and omits the CLI even if requested", () => {
    const paths = writePaths({
      ...baseAnswers,
      name: "@canonical/my-svelte-lib",
      type: "library",
      framework: "svelte",
      withCli: true,
    });

    expect(paths.some((p) => p.endsWith("package.json"))).toBe(true);
    expect(paths.some((p) => p.endsWith("svelte.config.js"))).toBe(true);
    expect(paths.some((p) => p.endsWith("vite.config.ts"))).toBe(true);
    expect(paths.some((p) => p.endsWith("tsconfig.build.json"))).toBe(true);
    expect(paths.some((p) => p.endsWith("Example.svelte"))).toBe(true);
    expect(paths.some((p) => p.endsWith("Example.ssr.test.ts"))).toBe(true);
    expect(paths.some((p) => p.endsWith("Example.svelte.test.ts"))).toBe(true);

    // svelte-package publishes dist/ only; a src/cli.ts bin can never ship.
    expect(paths.some((p) => p.endsWith("cli.ts"))).toBe(false);
  });

  it("wires svelte-CSF storybook files for a svelte library", () => {
    const paths = writePaths({
      ...baseAnswers,
      name: "@canonical/my-svelte-lib",
      type: "library",
      framework: "svelte",
      withStorybook: true,
    });

    expect(paths.some((p) => p.endsWith("main.ts"))).toBe(true);
    expect(paths.some((p) => p.endsWith("preview.ts"))).toBe(true);
    expect(paths.some((p) => p.endsWith("Example.stories.svelte"))).toBe(true);
  });

  it("creates directory structure using short name", () => {
    const result = dryRun(
      generator.generate({ ...baseAnswers, name: "@canonical/my-pkg" }),
    );
    const mkdirPaths = result.effects
      .filter((e) => e._tag === "MakeDir")
      .map((e) => (e as { path: string }).path);

    expect(mkdirPaths.some((p) => p === "my-pkg")).toBe(true);
    expect(mkdirPaths.some((p) => p.endsWith("src"))).toBe(true);
  });
});
