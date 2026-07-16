/**
 * Undo integration tests for package generator
 */

import { collectUndos, dryRun } from "@canonical/task";
import { describe, expect, it } from "vitest";
import { generator } from "../../package/index.js";
import type { PackageAnswers } from "../../shared/index.js";

const baseAnswers: PackageAnswers = {
  name: "@canonical/test-pkg",
  type: "tool-ts",
  description: "Test",
  framework: "none",
  withStorybook: false,
  withCli: false,
  withPrTemplate: false,
  runInstall: false,
};

describe("package generator undo plan", () => {
  it("produces undos for tool-ts package", () => {
    const task = generator.generate(baseAnswers);
    const undos = collectUndos(task);

    // 2 mkdirs + 6 templates (package.json, tsconfig, biome, index.ts,
    // index.test.ts, README) × 2 = 14
    expect(undos.length).toBe(14);
  });

  it("produces more undos with CLI enabled", () => {
    const withCli = { ...baseAnswers, withCli: true };
    const without = collectUndos(generator.generate(baseAnswers));
    const with_ = collectUndos(generator.generate(withCli));

    // CLI adds 1 template = 2 more undos
    expect(with_.length).toBe(without.length + 2);
  });

  it("produces more undos with the PR template enabled", () => {
    const withTemplate = { ...baseAnswers, withPrTemplate: true };
    const without = collectUndos(generator.generate(baseAnswers));
    const with_ = collectUndos(generator.generate(withTemplate));

    // PR template adds mkdir(.github) + 1 template = 3 more undos
    expect(with_.length).toBe(without.length + 3);
  });

  it("CSS package has different file set", () => {
    const cssAnswers: PackageAnswers = {
      ...baseAnswers,
      name: "@canonical/my-styles",
      type: "css",
    };
    const undos = collectUndos(generator.generate(cssAnswers));

    // CSS: 2 mkdirs + no tsconfig/build/test + packageJson + biome + indexCss
    // + readme = 2 + 4 templates × 2 = 10
    expect(undos.length).toBe(10);
  });

  it("plain library adds a build config and barrel test", () => {
    const libAnswers: PackageAnswers = {
      ...baseAnswers,
      name: "@canonical/my-lib",
      type: "library",
      framework: "none",
    };
    const undos = collectUndos(generator.generate(libAnswers));

    // 2 mkdirs + 7 templates (package.json, tsconfig, tsconfig.build, biome,
    // index.ts, index.test.ts, README) × 2 = 16
    expect(undos.length).toBe(16);
  });

  it("svelte library produces its full file set", () => {
    const svelteAnswers: PackageAnswers = {
      ...baseAnswers,
      name: "@canonical/my-svelte-lib",
      type: "library",
      framework: "svelte",
    };
    const undos = collectUndos(generator.generate(svelteAnswers));

    // 3 explicit mkdirs (pkg, src/lib, Example) + 16 templates × 2 = 35
    expect(undos.length).toBe(35);
  });

  it("svelte storybook adds three files and a directory", () => {
    const svelteAnswers: PackageAnswers = {
      ...baseAnswers,
      name: "@canonical/my-svelte-lib",
      type: "library",
      framework: "svelte",
    };
    const without = collectUndos(generator.generate(svelteAnswers));
    const with_ = collectUndos(
      generator.generate({ ...svelteAnswers, withStorybook: true }),
    );

    // storybook adds mkdir(.storybook) + 3 templates (main, preview, stories)
    // = 1 + 6 = 7 more undos
    expect(with_.length).toBe(without.length + 7);
  });

  it("exec effects (runInstall) produce no undos", () => {
    const installAnswers: PackageAnswers = {
      ...baseAnswers,
      runInstall: true,
    };
    const withInstall = collectUndos(generator.generate(installAnswers));
    const withoutInstall = collectUndos(generator.generate(baseAnswers));

    // runInstall triggers detectPackageManager(exists checks) + exec
    // exists has no undo, exec has no undo → same undo count
    expect(withInstall.length).toBe(withoutInstall.length);
  });

  it("undo effects are only DeleteFile and DeleteDirectory", () => {
    const undos = collectUndos(generator.generate(baseAnswers));
    const tags = undos.flatMap((undo) =>
      dryRun(undo).effects.map((e) => e._tag),
    );

    for (const tag of tags) {
      expect(["DeleteFile", "DeleteDirectory"]).toContain(tag);
    }
  });

  it("storybook adds more undos", () => {
    const sbAnswers: PackageAnswers = {
      ...baseAnswers,
      withStorybook: true,
    };
    const without = collectUndos(generator.generate(baseAnswers));
    const with_ = collectUndos(generator.generate(sbAnswers));

    // Storybook adds 3 mkdirs + 2 templates = 3 + 4 = 7 more undos
    expect(with_.length).toBe(without.length + 7);
  });
});
