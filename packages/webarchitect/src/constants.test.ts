import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BUNDLED_RULESETS_DIR } from "./constants.js";

describe("constants", () => {
  it("BUNDLED_RULESETS_DIR points to an existing directory", () => {
    expect(existsSync(BUNDLED_RULESETS_DIR)).toBe(true);
  });

  it("BUNDLED_RULESETS_DIR contains ruleset files", async () => {
    const { readdir } = await import("node:fs/promises");
    const files = await readdir(BUNDLED_RULESETS_DIR);
    const rulesets = files.filter((f) => f.endsWith(".ruleset.json"));
    expect(rulesets.length).toBeGreaterThan(0);
  });
});
