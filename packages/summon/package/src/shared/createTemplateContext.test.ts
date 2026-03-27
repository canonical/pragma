import { describe, expect, it } from "vitest";
import createTemplateContext from "./createTemplateContext.js";
import type { MonorepoInfo, PackageAnswers } from "./types.js";

const baseAnswers: PackageAnswers = {
  name: "@canonical/test-pkg",
  type: "tool-ts",
  description: "Test package",
  withReact: false,
  withStorybook: false,
  withCli: false,
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
