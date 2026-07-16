import { describe, expect, it } from "vitest";
import resolveFramework, {
  type RawPackageAnswers,
} from "./resolveFramework.js";

const baseRaw: RawPackageAnswers = {
  name: "@canonical/test-pkg",
  type: "library",
  description: "Test",
  withStorybook: false,
  withCli: false,
  withPrTemplate: false,
  runInstall: false,
};

describe("resolveFramework", () => {
  it("defaults a missing framework to none", () => {
    const { answers, warnings } = resolveFramework(baseRaw);
    expect(answers.framework).toBe("none");
    expect(warnings).toEqual([]);
  });

  it("keeps a valid framework on a library without warnings", () => {
    const { answers, warnings } = resolveFramework({
      ...baseRaw,
      framework: "react",
      withCli: true,
    });
    expect(answers.framework).toBe("react");
    // withCli is unrelated to react, so it is preserved
    expect(answers.withCli).toBe(true);
    expect(warnings).toEqual([]);
  });

  it("coerces framework to none for non-library types with a warning", () => {
    const { answers, warnings } = resolveFramework({
      ...baseRaw,
      type: "tool-ts",
      framework: "svelte",
    });
    expect(answers.framework).toBe("none");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("only applies to library packages");
  });

  it("does not warn when a non-library type already has framework none", () => {
    const { answers, warnings } = resolveFramework({
      ...baseRaw,
      type: "css",
      framework: "none",
    });
    expect(answers.framework).toBe("none");
    expect(warnings).toEqual([]);
  });

  it("coerces withCli off for svelte libraries with a warning", () => {
    const { answers, warnings } = resolveFramework({
      ...baseRaw,
      framework: "svelte",
      withCli: true,
    });
    expect(answers.framework).toBe("svelte");
    expect(answers.withCli).toBe(false);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("cannot ship a src/cli.ts binary");
  });

  it("keeps withCli for a svelte library that did not request a CLI", () => {
    const { answers, warnings } = resolveFramework({
      ...baseRaw,
      framework: "svelte",
      withCli: false,
    });
    expect(answers.withCli).toBe(false);
    expect(warnings).toEqual([]);
  });
});
