import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import resolveWriteConfigPath from "./resolveWriteConfigPath.js";

describe("resolveWriteConfigPath", () => {
  let xdgDir: string;
  let projectDir: string;
  let originalXdg: string | undefined;

  beforeEach(() => {
    originalXdg = process.env.XDG_CONFIG_HOME;
    xdgDir = mkdtempSync(join(tmpdir(), "pragma-write-xdg-"));
    process.env.XDG_CONFIG_HOME = xdgDir;
    projectDir = mkdtempSync(join(tmpdir(), "pragma-write-project-"));
    mkdirSync(join(projectDir, ".git"));
  });

  afterEach(() => {
    process.env.XDG_CONFIG_HOME = originalXdg;
    rmSync(xdgDir, { recursive: true, force: true });
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("targets the nearest existing project file", () => {
    writeFileSync(join(projectDir, "pragma.config.json"), "{}");
    const sub = join(projectDir, "packages/app");
    mkdirSync(sub, { recursive: true });
    expect(resolveWriteConfigPath(sub)).toBe(
      join(projectDir, "pragma.config.json"),
    );
  });

  it("falls back to the global file when no project file exists", () => {
    expect(resolveWriteConfigPath(projectDir)).toBe(
      join(xdgDir, "pragma/config.json"),
    );
  });

  it("honors an explicit local scope even without an existing file", () => {
    expect(resolveWriteConfigPath(projectDir, "local")).toBe(
      join(projectDir, "pragma.config.json"),
    );
  });

  it("honors an explicit global scope over an existing project file", () => {
    writeFileSync(join(projectDir, "pragma.config.json"), "{}");
    expect(resolveWriteConfigPath(projectDir, "global")).toBe(
      join(xdgDir, "pragma/config.json"),
    );
  });
});
