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
  DetectionSignal,
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

/**
 * Wrap a harness definition as a (high-confidence) detection. `matched`
 * defaults to EVERY signal, which is the "this machine really has it" case;
 * a case about the global band passes the subset it means.
 */
const detected = (
  h: HarnessDefinition,
  matched: readonly DetectionSignal[] = h.detect,
): DetectedHarness => ({
  harness: h,
  confidence: "high",
  configExists: false,
  configPath: h.configPath("/project"),
  matched,
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

  it.each(cases)(
    "harness %s under scope=%s in %s band → %s",
    (harnessScope, scope, band, expected) => {
      expect(isHarnessInBand(harnessScope, scope, band)).toBe(expected);
    },
  );
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

  /**
   * The global band has to be EARNED. A committed `.vscode/` travels with the
   * repository and says nothing about the machine, so on its own it must not
   * create a per-user VS Code config for every contributor who clones.
   */
  it("drops a both harness the global band was not earned for", () => {
    // Only the project-relative signal matched: `.vscode/` is in the checkout.
    const projectOnly = detected(requireHarness("vscode"), [
      { type: "directory", path: ".vscode" },
    ]);
    expect(
      listHarnessesForBand([projectOnly], "global", "global"),
    ).toHaveLength(0);
    // The PROJECT band is unaffected — that is the right file for that fact.
    expect(
      listHarnessesForBand([projectOnly], "global", "project").map(
        (d) => d.harness.id,
      ),
    ).toEqual(["vscode"]);
  });

  it("keeps a both harness one of whose USER-LEVEL signals matched", () => {
    const installed = detected(requireHarness("vscode"), [
      { type: "directory", path: ".vscode" },
      { type: "process", name: "code" },
    ]);
    expect(
      listHarnessesForBand([installed], "global", "global").map(
        (d) => d.harness.id,
      ),
    ).toEqual(["vscode"]);
  });

  it("exempts a both harness that declares no user-level signal at all", () => {
    // Cursor's whole `detect` is the project-relative `.cursor`, so it has
    // nothing to earn the band WITH — the rule would silence its documented
    // `~/.cursor/mcp.json` forever rather than gate it.
    const cursor = detected(requireHarness("cursor"));
    expect(cursor.harness.detect).toEqual([
      { type: "directory", path: ".cursor" },
    ]);
    expect(
      listHarnessesForBand([cursor], "global", "global").map(
        (d) => d.harness.id,
      ),
    ).toEqual(["cursor"]);
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

  /**
   * VS Code's two bands. The row is `both` now, so the same detection resolves
   * to a different file per selection — which is the whole point of the change:
   * the DEFAULT global run reaches VS Code without `--local`.
   */
  it("resolves VS Code to its per-user mcp.json under scope=global", () => {
    const groups = groupTargetsForScope(
      [vscode],
      "/project",
      "global",
      PLATFORM,
    );
    expect(groups.map((g) => g.path)).toEqual([
      "/home/tester/.config/Code/User/mcp.json",
    ]);
    expect(groups[0]?.scope).toBe("global");
    expect(groups[0]?.writes.map((w) => w.mcpKey)).toEqual(["servers"]);
  });

  it("writes ONLY the project file for VS Code under scope=both", () => {
    // A dual-scope harness has already written its project file in the project
    // band, so the global band under `both` takes global-ONLY rows — no
    // double-write. `--global` is the selection that reaches the user file.
    const groups = groupTargetsForScope([vscode], "/project", "both", PLATFORM);
    expect(groups.map((g) => g.path)).toEqual(["/project/.vscode/mcp.json"]);
  });

  it("collapses the three VS Code products to ONE project write", () => {
    // All three resolve to `.vscode/mcp.json` under the same `servers` key, so
    // the `(path, mcpKey)` dedup makes a single write however many of them
    // detect — the file is never written three times.
    const insiders = detected(requireHarness("vscode-insiders"));
    const vscodium = detected(requireHarness("vscodium"));
    const groups = groupConfigTargets(
      [vscode, insiders, vscodium],
      "/project",
      "project",
      PLATFORM,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]?.harnessNames).toEqual([
      "VS Code",
      "VS Code Insiders",
      "VSCodium",
    ]);
    expect(groups[0]?.writes).toHaveLength(1);
  });

  it("gives the VS Code family NO per-user file under WSL", () => {
    // The Linux-side `mcp.json` is read by nothing there (see the row's own
    // note, and AV-287), so the row contributes no global group at all — the
    // project file is where the entry lands, as it always has.
    const insiders = detected(requireHarness("vscode-insiders"));
    const vscodium = detected(requireHarness("vscodium"));
    const wsl: PlatformEnv = { ...PLATFORM, isWsl: true };
    expect(
      groupConfigTargets(
        [vscode, insiders, vscodium],
        "/project",
        "global",
        wsl,
      ),
    ).toEqual([]);
    // A sibling row with a real per-user location still groups.
    expect(
      groupConfigTargets([windsurf], "/project", "global", wsl).map(
        (g) => g.path,
      ),
    ).toEqual(["/home/tester/.codeium/windsurf/mcp_config.json"]);
  });

  it("gives each VS Code product its OWN per-user file under scope=global", () => {
    // Per-user, the three products are three different directories — the
    // shared project file is the only place they coincide.
    const insiders = detected(requireHarness("vscode-insiders"));
    const vscodium = detected(requireHarness("vscodium"));
    const groups = groupConfigTargets(
      [vscode, insiders, vscodium],
      "/project",
      "global",
      PLATFORM,
    );
    expect(groups.map((g) => g.path)).toEqual([
      "/home/tester/.config/Code - Insiders/User/mcp.json",
      "/home/tester/.config/Code/User/mcp.json",
      "/home/tester/.config/VSCodium/User/mcp.json",
    ]);
  });
});
