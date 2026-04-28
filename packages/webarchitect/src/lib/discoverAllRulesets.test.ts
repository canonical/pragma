import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import discoverAllRulesets from "./discoverAllRulesets.js";

describe("discoverAllRulesets", () => {
  it("finds bundled rulesets including 'base'", async () => {
    const result = await discoverAllRulesets();
    expect(result.bundled.length).toBeGreaterThan(0);
    expect(result.bundled.some((r) => r.name === "base")).toBe(true);
    expect(result.bundled.every((r) => r.type === "bundled")).toBe(true);
    expect(result.bundled.every((r) => r.path.endsWith(".ruleset.json"))).toBe(
      true,
    );
  });

  it("discovers local rulesets from current working directory", async () => {
    const tmp = join(tmpdir(), `webarchitect-discover-all-${Date.now()}`);
    mkdirSync(tmp, { recursive: true });
    writeFileSync(
      join(tmp, "custom.ruleset.json"),
      JSON.stringify({ name: "custom" }),
    );
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tmp);
    try {
      const result = await discoverAllRulesets();
      expect(result.local.some((r) => r.name === "custom")).toBe(true);
      expect(result.local.find((r) => r.name === "custom")?.type).toBe("local");
    } finally {
      cwdSpy.mockRestore();
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
