/**
 * Tests for shared utilities: validation, derivation, template context
 */

import { describe, expect, it } from "vitest";
import {
  createTemplateContext,
  derivePackageConfig,
  type PackageAnswers,
  validatePackageName,
} from "../shared/index.js";

// =============================================================================
// validatePackageName
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

// =============================================================================
// derivePackageConfig — all 6 leaves
// =============================================================================

describe("derivePackageConfig", () => {
  const base: PackageAnswers = {
    name: "@canonical/test",
    description: "test",
    content: "typescript",
    framework: "none",
    isComponentLibrary: false,
    withCli: false,
    runInstall: false,
  };

  it("Leaf A: CSS — no build, LGPL, no storybook, base ruleset", () => {
    const config = derivePackageConfig({ ...base, content: "css" });
    expect(config.needsBuild).toBe(false);
    expect(config.license).toBe("LGPL-3.0");
    expect(config.storybook).toBe(false);
    expect(config.ruleset).toBe("base");
    expect(config.module).toBe("src/index.css");
    expect(config.types).toBeNull();
    expect(config.files).toEqual(["src"]);
  });

  it("Leaf C: TS + React + component lib — build, LGPL, storybook, package-react", () => {
    const config = derivePackageConfig({
      ...base,
      framework: "react",
      isComponentLibrary: true,
    });
    expect(config.needsBuild).toBe(true);
    expect(config.license).toBe("LGPL-3.0");
    expect(config.storybook).toBe(true);
    expect(config.ruleset).toBe("package-react");
    expect(config.module).toBe("dist/esm/index.js");
    expect(config.types).toBe("dist/types/index.d.ts");
    expect(config.files).toEqual(["dist"]);
  });

  it("Leaf D: TS + React + no components + CLI — no build, GPL, no storybook", () => {
    const config = derivePackageConfig({
      ...base,
      framework: "react",
      isComponentLibrary: false,
      withCli: true,
    });
    expect(config.needsBuild).toBe(false);
    expect(config.license).toBe("GPL-3.0");
    expect(config.storybook).toBe(false);
    expect(config.ruleset).toBe("package-react");
    expect(config.module).toBe("src/index.ts");
    expect(config.types).toBe("src/index.ts");
    expect(config.files).toEqual(["src"]);
  });

  it("Leaf E: TS + React + no components + no CLI — build, LGPL, no storybook", () => {
    const config = derivePackageConfig({
      ...base,
      framework: "react",
      isComponentLibrary: false,
      withCli: false,
    });
    expect(config.needsBuild).toBe(true);
    expect(config.license).toBe("LGPL-3.0");
    expect(config.storybook).toBe(false);
    expect(config.ruleset).toBe("package-react");
    expect(config.module).toBe("dist/esm/index.js");
    expect(config.types).toBe("dist/types/index.d.ts");
    expect(config.files).toEqual(["dist"]);
  });

  it("Leaf F: TS + none + CLI — no build, GPL, tool-ts ruleset", () => {
    const config = derivePackageConfig({
      ...base,
      framework: "none",
      withCli: true,
    });
    expect(config.needsBuild).toBe(false);
    expect(config.license).toBe("GPL-3.0");
    expect(config.storybook).toBe(false);
    expect(config.ruleset).toBe("tool-ts");
    expect(config.module).toBe("src/index.ts");
    expect(config.types).toBe("src/index.ts");
    expect(config.files).toEqual(["src"]);
  });

  it("Leaf G: TS + none + no CLI — build, LGPL, library ruleset", () => {
    const config = derivePackageConfig({
      ...base,
      framework: "none",
      withCli: false,
    });
    expect(config.needsBuild).toBe(true);
    expect(config.license).toBe("LGPL-3.0");
    expect(config.storybook).toBe(false);
    expect(config.ruleset).toBe("library");
    expect(config.module).toBe("dist/esm/index.js");
    expect(config.types).toBe("dist/types/index.d.ts");
    expect(config.files).toEqual(["dist"]);
  });
});

// =============================================================================
// createTemplateContext
// =============================================================================

describe("createTemplateContext", () => {
  const base: PackageAnswers = {
    name: "@canonical/test-pkg",
    description: "Test package",
    content: "typescript",
    framework: "none",
    isComponentLibrary: false,
    withCli: false,
    runInstall: false,
  };

  it("creates context with version and monorepo version", () => {
    const ctx = createTemplateContext(base, "1.2.3", "1.2.3");
    expect(ctx.name).toBe("@canonical/test-pkg");
    expect(ctx.shortName).toBe("test-pkg");
    expect(ctx.version).toBe("1.2.3");
    expect(ctx.monorepoVersion).toBe("1.2.3");
  });

  it("includes derived fields", () => {
    const ctx = createTemplateContext(base, "0.1.0");
    expect(ctx.license).toBe("LGPL-3.0");
    expect(ctx.needsBuild).toBe(true);
    expect(ctx.storybook).toBe(false);
    expect(ctx.ruleset).toBe("library");
  });

  it("includes answer fields", () => {
    const ctx = createTemplateContext(
      { ...base, framework: "react", isComponentLibrary: true },
      "0.1.0",
    );
    expect(ctx.content).toBe("typescript");
    expect(ctx.framework).toBe("react");
    expect(ctx.isComponentLibrary).toBe(true);
    expect(ctx.storybook).toBe(true);
  });

  it("handles unscoped package names", () => {
    const ctx = createTemplateContext({ ...base, name: "my-package" }, "0.1.0");
    expect(ctx.name).toBe("my-package");
    expect(ctx.shortName).toBe("my-package");
  });
});
