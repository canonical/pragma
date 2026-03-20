import { dryRunWith, type Effect } from "@canonical/task";
import { describe, expect, it } from "vitest";
import setupMcp from "./setupMcp.js";

const mockExists =
  (predicate: (path: string) => boolean) =>
  (effect: Effect): unknown =>
    predicate((effect as Effect & { _tag: "Exists" }).path);

function mocks(
  existsPredicate: (path: string) => boolean,
): Map<string, (effect: Effect) => unknown> {
  return new Map([["Exists", mockExists(existsPredicate)]]);
}

describe("setupMcp", () => {
  it("warns when no harnesses are detected", () => {
    const result = dryRunWith(
      setupMcp("/project"),
      mocks(() => false),
    );
    const logs = result.effects.filter((e) => e._tag === "Log");
    expect(logs.some((l) => l.message.includes("No AI harnesses"))).toBe(true);
  });

  it("does not write config when no harnesses detected", () => {
    const result = dryRunWith(
      setupMcp("/project"),
      mocks(() => false),
    );
    const writes = result.effects.filter((e) => e._tag === "WriteFile");
    expect(writes).toHaveLength(0);
  });

  it("detects Claude Code and writes config (dry-run defaults confirm)", () => {
    const result = dryRunWith(
      setupMcp("/project"),
      mocks((p) => p.includes(".claude") || p === "/project/.mcp.json"),
    );

    const writes = result.effects.filter(
      (e) => e._tag === "WriteFile",
    ) as (Effect & { _tag: "WriteFile" })[];
    expect(writes.length).toBeGreaterThan(0);

    // At least one write should contain pragma MCP config
    const mcpWrite = writes.find((w) => w.path.includes(".mcp.json"));
    expect(mcpWrite).toBeDefined();
    if (mcpWrite) {
      const config = JSON.parse(mcpWrite.content);
      expect(config.mcpServers?.pragma?.command).toBe("pragma");
    }
  });

  it("force harness bypasses detection", () => {
    const result = dryRunWith(
      setupMcp("/project", "claude-code"),
      mocks(() => false), // nothing exists, but force skips detection
    );

    const writes = result.effects.filter((e) => e._tag === "WriteFile");
    expect(writes.length).toBeGreaterThan(0);

    const logs = result.effects.filter((e) => e._tag === "Log");
    expect(logs.some((l) => l.message.includes("✓"))).toBe(true);
  });

  it("warns on unknown force harness", () => {
    const result = dryRunWith(
      setupMcp("/project", "nonexistent"),
      mocks(() => false),
    );

    const logs = result.effects.filter((e) => e._tag === "Log");
    expect(logs.some((l) => l.message.includes("Unknown harness"))).toBe(true);

    const writes = result.effects.filter((e) => e._tag === "WriteFile");
    expect(writes).toHaveLength(0);
  });

  it("detects multiple harnesses", () => {
    const result = dryRunWith(
      setupMcp("/project"),
      mocks(
        (p) =>
          p.includes(".claude") ||
          p.includes(".mcp.json") ||
          p.includes(".cursor"),
      ),
    );

    const logs = result.effects.filter((e) => e._tag === "Log");
    const detectedLog = logs.find((l) => l.message.includes("Detected"));
    expect(detectedLog).toBeDefined();

    // Multiple writes expected (one per confirmed harness)
    const writes = result.effects.filter((e) => e._tag === "WriteFile");
    expect(writes.length).toBeGreaterThanOrEqual(2);
  });

  it("includes prompt effects for each detected harness", () => {
    const result = dryRunWith(
      setupMcp("/project"),
      mocks(
        (p) =>
          p.includes(".claude") ||
          p.includes(".mcp.json") ||
          p.includes(".cursor"),
      ),
    );

    const prompts = result.effects.filter((e) => e._tag === "Prompt");
    expect(prompts.length).toBeGreaterThanOrEqual(2);
  });
});
