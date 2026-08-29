/**
 * The harness inventory roll-up — the pure half, driven by fixtures.
 *
 * `doctor.test.ts` covers the wiring (both bands, `--verbose`, the real
 * registry). What is unit-tested here is the classification itself: the
 * registry supplies the universe so the NEGATIVE is representable, the groups
 * supply the state, and no combination of the two may ever produce a `fail`.
 */

import { describe, expect, it } from "vitest";
import {
  harnessInventory,
  type InventoryGroup,
  type InventoryHarness,
  type InventoryMember,
  type InventoryRow,
  inventoryHealth,
  inventoryItems,
  isDetectedState,
  type WriteState,
} from "./harnessInventory.js";

const REGISTRY: InventoryHarness[] = [
  { id: "claude-code", name: "Claude Code", inBand: true },
  { id: "cursor", name: "Cursor", inBand: true },
  { id: "vscode", name: "VS Code", inBand: false },
];

/** One harness's share of a file — its OWN write's state, never the file's. */
const named = (name: string, state: WriteState): InventoryMember => ({
  name,
  state,
});

const roll = (groups: InventoryGroup[]): InventoryRow[] =>
  harnessInventory(REGISTRY, groups, "global");

describe("harnessInventory — the roll-up", () => {
  it("classifies each registry harness against the band's groups", () => {
    const rows = roll([
      {
        path: "~/.claude.json",
        harnesses: [named("Claude Code", "configured")],
      },
      { path: "~/.cursor/mcp.json", harnesses: [named("Cursor", "absent")] },
    ]);

    expect(rows.map((r) => `${r.harnessId}:${r.state}`)).toEqual([
      "claude-code:registered",
      "cursor:detected",
      // Not detected AND has no location in this band at all — the two are
      // different facts and the row says which one applies.
      "vscode:unbanded",
    ]);
    expect(rows[0]?.locations).toEqual(["~/.claude.json"]);
    expect(rows[2]?.locations).toEqual([]);
  });

  it("keeps 'undetected' and 'unbanded' apart", () => {
    // Same absence, two different reasons: Cursor could be here and is not,
    // VS Code could never be here at all.
    const rows = roll([]);
    expect(rows.find((r) => r.harnessId === "cursor")?.state).toBe(
      "undetected",
    );
    expect(rows.find((r) => r.harnessId === "vscode")?.state).toBe("unbanded");
  });

  it("reports a drifted group as drifted, not as registered", () => {
    const rows = roll([
      { path: "~/.claude.json", harnesses: [named("Claude Code", "drifted")] },
    ]);
    expect(rows[0]?.state).toBe("drifted");
  });

  it("a harness sharing two files is registered only when BOTH carry the entry", () => {
    const both = harnessInventory(
      REGISTRY,
      [
        { path: "a.json", harnesses: [named("Cursor", "configured")] },
        { path: "b.json", harnesses: [named("Cursor", "configured")] },
      ],
      "global",
    );
    expect(both[1]?.state).toBe("registered");
    expect(both[1]?.locations).toEqual(["a.json", "b.json"]);

    const mixed = harnessInventory(
      REGISTRY,
      [
        { path: "a.json", harnesses: [named("Cursor", "configured")] },
        { path: "b.json", harnesses: [named("Cursor", "absent")] },
      ],
      "global",
    );
    expect(mixed[1]?.state).toBe("drifted");
  });

  it("gives each harness sharing ONE file its own state, not the file's", () => {
    // The co-detection case, and the reason a group carries per-harness state:
    // `.vscode/mcp.json` holds VS Code's `servers` and Cline's `mcpServers` as
    // two independent entries. Register pragma for VS Code alone and the FILE
    // classifies as drifted — one key current, one absent — but neither
    // harness is drifted: VS Code is registered and Cline is merely detected.
    // A fixture with one harness per file cannot see this.
    const shared: InventoryHarness[] = [
      { id: "cline", name: "Cline", inBand: true },
      { id: "vscode", name: "VS Code", inBand: true },
    ];
    const rows = harnessInventory(
      shared,
      [
        {
          path: ".vscode/mcp.json",
          harnesses: [named("Cline", "absent"), named("VS Code", "configured")],
        },
      ],
      "project",
    );

    expect(rows.map((r) => `${r.harnessId}:${r.state}`)).toEqual([
      "cline:detected",
      "vscode:registered",
    ]);
    // Both are located in the same file — the sharing itself is unchanged.
    for (const row of rows) expect(row.locations).toEqual([".vscode/mcp.json"]);
  });

  it("ignores a group naming a harness the registry does not know", () => {
    // The inventory reports on the REGISTRY; a group is evidence, not a source
    // of rows, so an unknown name adds nothing rather than inventing an entry.
    const rows = roll([
      { path: "x.json", harnesses: [named("Ghost Editor", "configured")] },
    ]);
    expect(rows).toHaveLength(REGISTRY.length);
    expect(rows.map((r) => r.harnessName)).not.toContain("Ghost Editor");
  });

  it("names every row with the band it was rolled up for", () => {
    const rows = harnessInventory(REGISTRY, [], "project");
    expect(rows.every((r) => r.band === "project")).toBe(true);
  });
});

describe("harnessInventory — the listing", () => {
  const rows = roll([
    { path: "~/.claude.json", harnesses: [named("Claude Code", "configured")] },
  ]);

  it("shows detected harnesses only by default", () => {
    const items = inventoryItems(rows, false);
    expect(items.map((i) => i.label)).toEqual(["Claude Code"]);
    expect(items[0]?.detail).toBe("registered — ~/.claude.json");
  });

  it("--verbose widens the same rows to the whole registry", () => {
    const items = inventoryItems(rows, true);
    expect(items.map((i) => i.label)).toEqual([
      "Claude Code",
      "Cursor",
      "VS Code",
    ]);
    expect(items[1]?.detail).toBe("not detected");
    // Scope-aware, and it states the FACT rather than naming a partition:
    // VS Code keeps its MCP config per project, so there is no global file for
    // pragma to be in. `no Global band` named an internal word for that.
    expect(items[2]?.detail).toBe(
      "keeps no global config — it is per-project only",
    );
  });

  it("never renders any state as a failure", () => {
    for (const item of inventoryItems(rows, true)) {
      expect(item.status).not.toBe("fail");
    }
    const every = harnessInventory(REGISTRY, [], "project");
    for (const item of inventoryItems(every, true)) {
      expect(item.status).not.toBe("fail");
    }
  });

  it("is a listing, not a verdict: pass when the band holds harnesses, skip when it does not", () => {
    expect(inventoryHealth(rows, false).status).toBe("pass");
    expect(inventoryHealth(rows, false).detail).toBe(
      "1 detected · 1 registered",
    );
    expect(inventoryHealth(rows, true).detail).toBe(
      "1 detected · 1 registered · 3 known",
    );

    const empty = roll([]);
    expect(inventoryHealth(empty, false).status).toBe("skip");
    expect(inventoryHealth(empty, false).detail).toBe("no harnesses detected");
    expect(inventoryHealth(empty, false).items).toEqual([]);
    expect(inventoryHealth(empty, true).detail).toBe(
      "none of 3 known harnesses detected",
    );
  });

  it("counts a drifted harness as detected but not as registered", () => {
    const drifted = roll([
      { path: "~/.claude.json", harnesses: [named("Claude Code", "drifted")] },
    ]);
    expect(inventoryHealth(drifted, false).detail).toBe(
      "1 detected · 0 registered",
    );
    expect(inventoryItems(drifted, false)[0]?.status).toBe("available");
  });
});

describe("isDetectedState", () => {
  it("counts every state that means the harness is on the machine", () => {
    expect(isDetectedState("registered")).toBe(true);
    expect(isDetectedState("drifted")).toBe(true);
    expect(isDetectedState("detected")).toBe(true);
    expect(isDetectedState("undetected")).toBe(false);
    expect(isDetectedState("unbanded")).toBe(false);
  });
});
