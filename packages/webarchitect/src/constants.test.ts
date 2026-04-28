import { readdir } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BUNDLED_RULESETS_DIR } from "./constants.js";

describe("constants", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock("node:fs");
  });

  it("resolves to srcPath when srcPath exists", async () => {
    vi.doMock("node:fs", () => ({
      existsSync: vi.fn().mockReturnValue(true),
    }));
    const { BUNDLED_RULESETS_DIR: dir } = await import("./constants.js");
    // srcPath is join(dirname, "../rulesets") — one level up
    expect(dir).toMatch(/rulesets$/);
    expect(dir).toBe(BUNDLED_RULESETS_DIR);
  });

  it("resolves to distPath when srcPath does not exist", async () => {
    vi.doMock("node:fs", () => ({
      existsSync: vi.fn().mockReturnValue(false),
    }));
    const { BUNDLED_RULESETS_DIR: dir } = await import("./constants.js");
    // distPath is join(dirname, "../../rulesets") — two levels up, different from srcPath
    expect(dir).toMatch(/rulesets$/);
    expect(dir).not.toBe(BUNDLED_RULESETS_DIR);
  });

  it("resolved directory contains bundled ruleset files", async () => {
    const files = await readdir(BUNDLED_RULESETS_DIR);
    const rulesets = files.filter((f) => f.endsWith(".ruleset.json"));
    expect(rulesets.length).toBeGreaterThan(0);
    expect(rulesets).toContain("base.ruleset.json");
  });
});
