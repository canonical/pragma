import {
  collectEffects,
  dryRun,
  dryRunWith,
  type Effect,
} from "@canonical/task";
import { describe, expect, it } from "vitest";
import detectHarnesses from "./detectHarnesses.js";

const mockExists =
  (predicate: (path: string) => boolean) =>
  (effect: Effect): unknown =>
    predicate((effect as Effect & { _tag: "Exists" }).path);

const mocks = (
  predicate: (path: string) => boolean,
): Map<string, (effect: Effect) => unknown> =>
  new Map([["Exists", mockExists(predicate)]]);

describe("detectHarnesses", () => {
  it("produces exists effects for each harness signal", () => {
    const effects = collectEffects(detectHarnesses("/project"));
    const existsEffects = effects.filter((e) => e._tag === "Exists");
    expect(existsEffects.length).toBeGreaterThan(0);
  });

  it("detects Claude Code when ~/.claude and .mcp.json exist", () => {
    const result = dryRunWith(
      detectHarnesses("/project"),
      mocks(
        (path) => path.includes(".claude") || path === "/project/.mcp.json",
      ),
    );

    const claude = result.value.find((d) => d.harness.id === "claude-code");
    expect(claude).toBeDefined();
    expect(claude?.confidence).toBe("high");
    expect(claude?.configExists).toBe(true);
    expect(claude?.configPath).toBe("/project/.mcp.json");
  });

  it("detects Cursor when .cursor directory exists", () => {
    const result = dryRunWith(
      detectHarnesses("/project"),
      mocks((path) => path.includes(".cursor")),
    );

    const cursor = result.value.find((d) => d.harness.id === "cursor");
    expect(cursor).toBeDefined();
    expect(cursor?.confidence).toBe("high");
  });

  it("detects Windsurf when .windsurf directory exists", () => {
    const result = dryRunWith(
      detectHarnesses("/project"),
      mocks((path) => path.includes(".windsurf")),
    );

    const windsurf = result.value.find((d) => d.harness.id === "windsurf");
    expect(windsurf).toBeDefined();
    expect(windsurf?.confidence).toBe("high");
  });

  it("detects multiple harnesses simultaneously", () => {
    const result = dryRunWith(
      detectHarnesses("/project"),
      mocks(
        (path) =>
          path.includes(".claude") ||
          path.includes(".mcp.json") ||
          path.includes(".cursor"),
      ),
    );

    expect(result.value.length).toBeGreaterThanOrEqual(2);
    const ids = result.value.map((d) => d.harness.id);
    expect(ids).toContain("claude-code");
    expect(ids).toContain("cursor");
  });

  it("returns empty array when no signals match", () => {
    const result = dryRunWith(
      detectHarnesses("/project"),
      mocks(() => false),
    );

    expect(result.value).toEqual([]);
  });

  it("sorts results by confidence (high first)", () => {
    const result = dryRunWith(
      detectHarnesses("/project"),
      mocks(
        (path) =>
          path.includes(".claude") ||
          path.includes(".mcp.json") ||
          path.includes(".cursor"),
      ),
    );

    const order = { high: 0, medium: 1, low: 2 } as const;
    for (let i = 1; i < result.value.length; i++) {
      expect(order[result.value[i].confidence]).toBeGreaterThanOrEqual(
        order[result.value[i - 1].confidence],
      );
    }
  });

  // Cline is disabled: it shares .vscode/mcp.json with VS Code
  it("does not detect Cline (disabled harness)", () => {
    const result = dryRunWith(
      detectHarnesses("/project"),
      mocks((path) => path.includes(".vscode")),
    );

    const cline = result.value.find((d) => d.harness.id === "cline");
    expect(cline).toBeUndefined();
  });

  it("reports configExists as false when config file is missing", () => {
    const result = dryRunWith(
      detectHarnesses("/project"),
      mocks((path) => path.includes(".cursor") && !path.endsWith("mcp.json")),
    );

    const cursor = result.value.find((d) => d.harness.id === "cursor");
    expect(cursor).toBeDefined();
    expect(cursor?.configExists).toBe(false);
  });

  it("dry run collects effects without executing", () => {
    const result = dryRun(detectHarnesses("/project"));
    expect(result.effects.length).toBeGreaterThan(0);
    expect(Array.isArray(result.value)).toBe(true);
  });
});
