import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import discoverRulesetsInDir from "./discoverRulesetsInDir.js";

describe("discoverRulesetsInDir", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = join(tmpdir(), `webarchitect-discover-${Date.now()}`);
    mkdirSync(tmp, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("discovers .ruleset.json files as bundled", async () => {
    writeFileSync(
      join(tmp, "test.ruleset.json"),
      JSON.stringify({ name: "test" }),
    );
    const results = await discoverRulesetsInDir(tmp, "bundled");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("test");
    expect(results[0].type).toBe("bundled");
    expect(results[0].path).toBe(join(tmp, "test.ruleset.json"));
  });

  it("discovers local rulesets with JSON validation", async () => {
    writeFileSync(
      join(tmp, "valid.ruleset.json"),
      JSON.stringify({ name: "valid" }),
    );
    writeFileSync(join(tmp, "invalid.ruleset.json"), "not json{");
    const results = await discoverRulesetsInDir(tmp, "local");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("valid");
  });

  it("skips non-ruleset files", async () => {
    writeFileSync(join(tmp, "readme.md"), "# docs");
    writeFileSync(join(tmp, "config.json"), "{}");
    const results = await discoverRulesetsInDir(tmp, "bundled");
    expect(results).toEqual([]);
  });

  it("returns empty array for non-existent directory", async () => {
    const results = await discoverRulesetsInDir(
      join(tmp, "nonexistent"),
      "bundled",
    );
    expect(results).toEqual([]);
  });

  it("returns empty array for empty directory", async () => {
    const results = await discoverRulesetsInDir(tmp, "bundled");
    expect(results).toEqual([]);
  });
});
