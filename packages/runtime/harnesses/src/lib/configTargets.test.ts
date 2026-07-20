import { describe, expect, it } from "vitest";
import {
  groupConfigTargets,
  groupTargetsForScope,
  isHarnessInBand,
  listHarnessesForBand,
  resolveBandsForScope,
} from "./configTargets.js";
import findHarnessById from "./findHarnessById.js";
import type { PlatformEnv } from "./platformPaths.js";
import type {
  DetectedHarness,
  HarnessDefinition,
  HarnessScope,
} from "./types.js";

const PLATFORM: PlatformEnv = {
  platform: "linux",
  env: {},
  home: "/home/tester",
  isWsl: false,
};

/** Build a minimal harness definition fixture. */
const harness = (overrides: Partial<HarnessDefinition>): HarnessDefinition => ({
  id: "fixture",
  name: "Fixture",
  version: "*",
  scope: "project",
  detect: [{ type: "directory", path: ".fixture" }],
  configPath: (root) => `${root}/.fixture/mcp.json`,
  configFormat: "json",
  mcpKey: "mcpServers",
  skillsPath: (root) => `${root}/.fixture/skills`,
  ...overrides,
});

/** Wrap a harness definition as a (high-confidence) detection. */
const detected = (h: HarnessDefinition): DetectedHarness => ({
  harness: h,
  confidence: "high",
  configExists: false,
  configPath: h.configPath("/project"),
});

/** Look up a registered harness, asserting it exists. */
const requireHarness = (id: string): HarnessDefinition => {
  const found = findHarnessById(id);
  if (!found) throw new Error(`missing harness fixture: ${id}`);
  return found;
};

const vscode = detected(requireHarness("vscode"));
const cline = detected(requireHarness("cline"));
const windsurf = detected(requireHarness("windsurf"));

describe("resolveBandsForScope", () => {
  it("runs both bands (project first) for scope=both", () => {
    expect(resolveBandsForScope("both")).toEqual(["project", "global"]);
  });

  it("runs only the global band for scope=global", () => {
    expect(resolveBandsForScope("global")).toEqual(["global"]);
  });

  it("runs only the project band for scope=project", () => {
    expect(resolveBandsForScope("project")).toEqual(["project"]);
  });
});

describe("isHarnessInBand", () => {
  const cases: [HarnessScope, HarnessScope, "project" | "global", boolean][] = [
    // project band takes project + both, never global
    ["project", "both", "project", true],
    ["both", "both", "project", true],
    ["global", "both", "project", false],
    // global band under scope=both takes global only (no dual-scope double-write)
    ["global", "both", "global", true],
    ["both", "both", "global", false],
    ["project", "both", "global", false],
    // global band under scope=global flips dual-scope to home
    ["global", "global", "global", true],
    ["both", "global", "global", true],
    ["project", "global", "global", false],
  ];

  it.each(
    cases,
  )("harness %s under scope=%s in %s band → %s", (harnessScope, scope, band, expected) => {
    expect(isHarnessInBand(harnessScope, scope, band)).toBe(expected);
  });
});

describe("listHarnessesForBand", () => {
  it("keeps project + both harnesses in the project band", () => {
    const list = listHarnessesForBand([vscode, windsurf], "both", "project");
    expect(list.map((d) => d.harness.id)).toEqual(["vscode"]);
  });

  it("keeps only global harnesses in the global band under scope=both", () => {
    const list = listHarnessesForBand([vscode, windsurf], "both", "global");
    expect(list.map((d) => d.harness.id)).toEqual(["windsurf"]);
  });
});

describe("groupConfigTargets", () => {
  it("merges VS Code + Cline into one file with two distinct-key writes", () => {
    const groups = groupConfigTargets(
      [vscode, cline],
      "/project",
      "project",
      PLATFORM,
    );
    expect(groups).toHaveLength(1);
    const group = groups[0];
    expect(group.path).toBe("/project/.vscode/mcp.json");
    expect(group.harnessNames).toEqual(["Cline", "VS Code"]);
    expect(group.writes.map((w) => w.mcpKey).sort()).toEqual([
      "mcpServers",
      "servers",
    ]);
    expect(group.scope).toBe("project");
  });

  it("collapses two harnesses sharing a path AND mcpKey to a single write", () => {
    const a = detected(harness({ id: "a", name: "A" }));
    const b = detected(harness({ id: "b", name: "B" }));
    const groups = groupConfigTargets([a, b], "/project", "project", PLATFORM);
    expect(groups).toHaveLength(1);
    expect(groups[0].harnessNames).toEqual(["A", "B"]);
    expect(groups[0].writes).toHaveLength(1);
  });

  it("returns one group per distinct file, sorted by path", () => {
    const first = detected(
      harness({ id: "z", name: "Z", configPath: () => "/project/z.json" }),
    );
    const second = detected(
      harness({ id: "a", name: "A", configPath: () => "/project/a.json" }),
    );
    const groups = groupConfigTargets(
      [first, second],
      "/project",
      "project",
      PLATFORM,
    );
    expect(groups.map((g) => g.path)).toEqual([
      "/project/a.json",
      "/project/z.json",
    ]);
  });

  it("resolves the home config in the global band", () => {
    const groups = groupConfigTargets(
      [windsurf],
      "/project",
      "global",
      PLATFORM,
    );
    expect(groups[0].path).toBe(
      "/home/tester/.codeium/windsurf/mcp_config.json",
    );
    expect(groups[0].scope).toBe("global");
  });
});

describe("groupTargetsForScope", () => {
  it("groups project then global bands for scope=both", () => {
    const groups = groupTargetsForScope(
      [vscode, windsurf],
      "/project",
      "both",
      PLATFORM,
    );
    // VS Code (project band) then Windsurf (global band).
    expect(groups.map((g) => g.scope)).toEqual(["project", "global"]);
    expect(groups.map((g) => g.path)).toEqual([
      "/project/.vscode/mcp.json",
      "/home/tester/.codeium/windsurf/mcp_config.json",
    ]);
  });

  it("emits only project-band groups for scope=project (global harness dropped)", () => {
    const groups = groupTargetsForScope(
      [vscode, windsurf],
      "/project",
      "project",
      PLATFORM,
    );
    expect(groups.map((g) => g.path)).toEqual(["/project/.vscode/mcp.json"]);
  });
});
