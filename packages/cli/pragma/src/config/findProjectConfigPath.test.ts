import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import findProjectConfigPath from "./findProjectConfigPath.js";

describe("findProjectConfigPath", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "pragma-find-config-"));
    mkdirSync(join(root, ".git"));
    mkdirSync(join(root, "packages/app/src"), { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("finds the config in the starting directory", () => {
    writeFileSync(join(root, "packages/app/pragma.config.json"), "{}");
    expect(findProjectConfigPath(join(root, "packages/app"))).toBe(
      join(root, "packages/app/pragma.config.json"),
    );
  });

  it("walks up to the nearest config", () => {
    writeFileSync(join(root, "pragma.config.json"), "{}");
    expect(findProjectConfigPath(join(root, "packages/app/src"))).toBe(
      join(root, "pragma.config.json"),
    );
  });

  it("prefers the nearest config over a higher one", () => {
    writeFileSync(join(root, "pragma.config.json"), "{}");
    writeFileSync(join(root, "packages/app/pragma.config.json"), "{}");
    expect(findProjectConfigPath(join(root, "packages/app/src"))).toBe(
      join(root, "packages/app/pragma.config.json"),
    );
  });

  it("stops at the repository root (.git) without escaping", () => {
    // The fixture root has .git and no config; nothing above it may leak in.
    expect(findProjectConfigPath(join(root, "packages/app/src"))).toBe(
      undefined,
    );
  });

  it("checks the .git directory's own level before stopping", () => {
    writeFileSync(join(root, "pragma.config.json"), "{}");
    expect(findProjectConfigPath(root)).toBe(join(root, "pragma.config.json"));
  });
});
