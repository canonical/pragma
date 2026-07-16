import { describe, expect, it } from "vitest";
import pkg from "../../package.json" with { type: "json" };
import createTemplateContext from "./createTemplateContext.js";
import type { MonorepoInfo, PackageAnswers } from "./types.js";

const baseAnswers: PackageAnswers = {
  name: "@canonical/test-pkg",
  type: "tool-ts",
  description: "Test package",
  framework: "none",
  withStorybook: false,
  withCli: false,
  withPrTemplate: false,
  runInstall: false,
};

describe("createTemplateContext", () => {
  it("creates context with monorepo version", () => {
    const monorepoInfo: MonorepoInfo = { isMonorepo: true, version: "1.2.3" };
    const ctx = createTemplateContext(baseAnswers, monorepoInfo);

    expect(ctx.name).toBe("@canonical/test-pkg");
    expect(ctx.shortName).toBe("test-pkg");
    expect(ctx.version).toBe("1.2.3");
    expect(ctx.license).toBe("GPL-3.0");
  });

  it("uses the monorepo version for @canonical/* dep ranges", () => {
    const monorepoInfo: MonorepoInfo = { isMonorepo: true, version: "1.2.3" };
    const ctx = createTemplateContext(baseAnswers, monorepoInfo);

    expect(ctx.configsVersion).toBe("1.2.3");
  });

  it("creates context with default version when not in monorepo", () => {
    const monorepoInfo: MonorepoInfo = { isMonorepo: false };
    const ctx = createTemplateContext(baseAnswers, monorepoInfo);

    expect(ctx.version).toBe("0.1.0");
  });

  it("falls back to the generator version for dep ranges when standalone", () => {
    const monorepoInfo: MonorepoInfo = { isMonorepo: false };
    const ctx = createTemplateContext(baseAnswers, monorepoInfo);

    // The generated package starts at 0.1.0, but its @canonical/* ranges pin
    // the generator's own (lockstep) version so a standalone install resolves.
    expect(ctx.version).toBe("0.1.0");
    expect(ctx.configsVersion).toBe(pkg.version);
  });

  it("falls back to 0.1.0 when monorepo has no version", () => {
    const monorepoInfo: MonorepoInfo = {
      isMonorepo: true,
      version: undefined,
    };
    const ctx = createTemplateContext(baseAnswers, monorepoInfo);

    expect(ctx.version).toBe("0.1.0");
    expect(ctx.configsVersion).toBe(pkg.version);
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
    expect(ctx.ruleset).toBe("tool-ts");
  });

  it("sets correct entry points for a plain library", () => {
    const answers: PackageAnswers = { ...baseAnswers, type: "library" };
    const monorepoInfo: MonorepoInfo = { isMonorepo: false };
    const ctx = createTemplateContext(answers, monorepoInfo);

    expect(ctx.module).toBe("dist/esm/index.js");
    expect(ctx.types).toBe("dist/types/index.d.ts");
    expect(ctx.license).toBe("LGPL-3.0");
    expect(ctx.needsBuild).toBe(true);
    expect(ctx.ruleset).toBe("library");
  });

  it("sets correct entry points and ruleset for a react library", () => {
    const answers: PackageAnswers = {
      ...baseAnswers,
      type: "library",
      framework: "react",
    };
    const monorepoInfo: MonorepoInfo = { isMonorepo: false };
    const ctx = createTemplateContext(answers, monorepoInfo);

    expect(ctx.module).toBe("dist/esm/index.js");
    expect(ctx.framework).toBe("react");
    expect(ctx.ruleset).toBe("package-react");
  });

  it("sets correct entry points and ruleset for a svelte library", () => {
    const answers: PackageAnswers = {
      ...baseAnswers,
      type: "library",
      framework: "svelte",
    };
    const monorepoInfo: MonorepoInfo = { isMonorepo: false };
    const ctx = createTemplateContext(answers, monorepoInfo);

    expect(ctx.module).toBe("dist/index.js");
    expect(ctx.types).toBe("dist/index.d.ts");
    expect(ctx.files).toContain("!dist/**/*.test.*");
    expect(ctx.framework).toBe("svelte");
    expect(ctx.ruleset).toBe("package-svelte");
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
    expect(ctx.ruleset).toBe("base");
  });
});
