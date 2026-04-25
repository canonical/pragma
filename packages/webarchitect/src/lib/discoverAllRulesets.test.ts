import { describe, expect, it } from "vitest";
import discoverAllRulesets from "./discoverAllRulesets.js";

describe("discoverAllRulesets", () => {
  it("returns both bundled and local rulesets", async () => {
    const result = await discoverAllRulesets();
    expect(result).toHaveProperty("bundled");
    expect(result).toHaveProperty("local");
    expect(Array.isArray(result.bundled)).toBe(true);
    expect(Array.isArray(result.local)).toBe(true);
  });

  it("finds bundled rulesets from the package", async () => {
    const result = await discoverAllRulesets();
    // webarchitect ships with bundled rulesets (base, library, tool-ts, etc.)
    expect(result.bundled.length).toBeGreaterThan(0);
    expect(result.bundled[0]).toHaveProperty("name");
    expect(result.bundled[0]).toHaveProperty("path");
    expect(result.bundled[0].type).toBe("bundled");
  });
});
