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
  withReact: false,
  withStorybook: false,
  withCli: false,
  runInstall: false,
};

describe("package generator undo plan", () => {
  it("produces undos for tool-ts package", () => {
    const task = generator.generate(baseAnswers);
    const undos = collectUndos(task);

    // 2 mkdirs + 6 templates × 2 + 1 mkdir(.github) = 15
    expect(undos.length).toBe(15);
  });

  it("produces more undos with CLI enabled", () => {
    const withCli = { ...baseAnswers, withCli: true };
    const without = collectUndos(generator.generate(baseAnswers));
    const with_ = collectUndos(generator.generate(withCli));

    // CLI adds 1 template = 2 more undos
    expect(with_.length).toBe(without.length + 2);
  });

  it("CSS package has different file set", () => {
    const cssAnswers: PackageAnswers = {
      ...baseAnswers,
      name: "@canonical/my-styles",
      type: "css",
    };
    const undos = collectUndos(generator.generate(cssAnswers));

    // CSS: 2 mkdirs + no tsconfig + packageJson + biome + indexCss + readme + mkdir(.github) + pullRequest
    // = 2 + 5 templates × 2 + 1 = 13
    expect(undos.length).toBe(13);
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
