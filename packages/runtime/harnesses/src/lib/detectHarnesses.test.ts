import {
  collectEffects,
  dryRun,
  dryRunWith,
  type Effect,
} from "@canonical/task";
import { describe, expect, it } from "vitest";
import detectHarnesses from "./detectHarnesses.js";
import type { PlatformEnv } from "./platformPaths.js";

/**
 * A fixed platform so the `~/…` signal paths and any `PATH`-based process probe
 * resolve deterministically (never against the CI host's real HOME/PATH).
 */
const PLATFORM: PlatformEnv = {
  platform: "linux",
  env: { PATH: "/usr/bin:/bin" },
  home: "/home/tester",
  isWsl: false,
};

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
      detectHarnesses("/project", PLATFORM),
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
      detectHarnesses("/project", PLATFORM),
      mocks((path) => path.includes(".cursor")),
    );

    const cursor = result.value.find((d) => d.harness.id === "cursor");
    expect(cursor).toBeDefined();
    expect(cursor?.confidence).toBe("high");
  });

  it("detects Windsurf when .windsurf directory exists", () => {
    const result = dryRunWith(
      detectHarnesses("/project", PLATFORM),
      mocks((path) => path.includes(".windsurf")),
    );

    const windsurf = result.value.find((d) => d.harness.id === "windsurf");
    expect(windsurf).toBeDefined();
    expect(windsurf?.confidence).toBe("high");
  });

  it("detects multiple harnesses simultaneously", () => {
    const result = dryRunWith(
      detectHarnesses("/project", PLATFORM),
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
      detectHarnesses("/project", PLATFORM),
      mocks(() => false),
    );

    expect(result.value).toEqual([]);
  });

  it("sorts results by confidence (high first)", () => {
    const result = dryRunWith(
      detectHarnesses("/project", PLATFORM),
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

  // Cline is re-enabled (7a) but detected ONLY by its extension: a bare
  // `.vscode` directory belongs to VS Code, so it must detect VS Code alone and
  // never co-detect Cline (which would write an inert `mcpServers` block).
  it("detects VS Code but NOT Cline from a bare .vscode directory", () => {
    const result = dryRunWith(
      detectHarnesses("/project", PLATFORM),
      mocks((path) => path.includes(".vscode")),
    );

    const ids = result.value.map((d) => d.harness.id);
    expect(ids).toContain("vscode");
    expect(ids).not.toContain("cline");
  });

  it("detects Cline when its saoudrizwan.claude-dev extension is installed", () => {
    const result = dryRunWith(
      detectHarnesses("/project", PLATFORM),
      new Map<string, (effect: Effect) => unknown>([
        [
          "Exists",
          (effect) =>
            (effect as Effect & { _tag: "Exists"; path: string }).path ===
            "/home/tester/.vscode/extensions",
        ],
        [
          "Glob",
          (effect) =>
            (effect as Effect & { _tag: "Glob"; pattern: string }).pattern ===
            "saoudrizwan.claude-dev-*"
              ? ["saoudrizwan.claude-dev-3.20.0"]
              : [],
        ],
      ]),
    );

    const cline = result.value.find((d) => d.harness.id === "cline");
    expect(cline).toBeDefined();
    expect(cline?.confidence).toBe("medium");
    // A bare extension must not drag in VS Code (no `.vscode` dir here).
    expect(result.value.map((d) => d.harness.id)).not.toContain("vscode");
  });

  it("reports configExists as false when config file is missing", () => {
    const result = dryRunWith(
      detectHarnesses("/project", PLATFORM),
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
