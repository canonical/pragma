import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PragmaError } from "../error/PragmaError.js";
import readConfigLayers from "./readConfigLayers.js";

describe("readConfigLayers", () => {
  let xdgDir: string;
  let projectDir: string;
  let originalXdg: string | undefined;

  beforeEach(() => {
    originalXdg = process.env.XDG_CONFIG_HOME;
    xdgDir = mkdtempSync(join(tmpdir(), "pragma-layers-xdg-"));
    process.env.XDG_CONFIG_HOME = xdgDir;
    projectDir = mkdtempSync(join(tmpdir(), "pragma-layers-project-"));
    mkdirSync(join(projectDir, ".git"));
  });

  afterEach(() => {
    process.env.XDG_CONFIG_HOME = originalXdg;
    rmSync(xdgDir, { recursive: true, force: true });
    rmSync(projectDir, { recursive: true, force: true });
  });

  function writeGlobal(content: string): void {
    mkdirSync(join(xdgDir, "pragma"), { recursive: true });
    writeFileSync(join(xdgDir, "pragma/config.json"), content);
  }

  function writeProject(content: string): void {
    writeFileSync(join(projectDir, "pragma.config.json"), content);
  }

  it("returns defaults with default origins when no layer exists", () => {
    const layers = readConfigLayers(projectDir);
    expect(layers.config).toEqual({ tier: undefined, channel: "normal" });
    expect(layers.origins).toEqual({
      tier: "default",
      channel: "default",
      packages: "default",
      trace: "default",
      framework: "default",
      stories: "default",
      prefixes: "default",
      detail: "default",
    });
    expect(layers.global.exists).toBe(false);
    expect(layers.project.exists).toBe(false);
    expect(layers.project.path).toBe(join(projectDir, "pragma.config.json"));
  });

  it("reads the global layer when no project file exists", () => {
    writeGlobal('{"channel":"experimental","tier":"global"}');
    const layers = readConfigLayers(projectDir);
    expect(layers.config.channel).toBe("experimental");
    expect(layers.config.tier).toBe("global");
    expect(layers.origins.channel).toBe("global");
    expect(layers.origins.tier).toBe("global");
    expect(layers.global.exists).toBe(true);
  });

  it("merges per field — project wins only the fields it sets", () => {
    writeGlobal('{"channel":"experimental","trace":true}');
    writeProject('{"tier":"apps/lxd"}');
    const layers = readConfigLayers(projectDir);
    expect(layers.config).toEqual({
      tier: "apps/lxd",
      channel: "experimental",
      trace: true,
    });
    expect(layers.origins).toEqual({
      tier: "project",
      channel: "global",
      packages: "default",
      trace: "global",
      framework: "default",
      stories: "default",
      prefixes: "default",
      detail: "default",
    });
  });

  it("lets the project override a global field wholesale", () => {
    writeGlobal('{"packages":["@canonical/a"],"channel":"experimental"}');
    writeProject('{"packages":["@canonical/b"],"channel":"normal"}');
    const layers = readConfigLayers(projectDir);
    expect(layers.config.packages).toEqual(["@canonical/b"]);
    expect(layers.config.channel).toBe("normal");
    expect(layers.origins.packages).toBe("project");
    expect(layers.origins.channel).toBe("project");
  });

  it("finds the project layer from a subdirectory", () => {
    writeProject('{"tier":"apps/lxd"}');
    const sub = join(projectDir, "packages/app");
    mkdirSync(sub, { recursive: true });
    const layers = readConfigLayers(sub);
    expect(layers.config.tier).toBe("apps/lxd");
    expect(layers.project.path).toBe(join(projectDir, "pragma.config.json"));
    expect(layers.project.exists).toBe(true);
  });

  it("throws on invalid JSON in the global layer", () => {
    writeGlobal("{not json");
    expect(() => readConfigLayers(projectDir)).toThrow(PragmaError);
  });
});
