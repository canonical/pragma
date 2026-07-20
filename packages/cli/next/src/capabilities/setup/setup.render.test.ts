/**
 * Render goldens for `pragma setup` — the MCP recap grouped by band.
 *
 * `summarizeMcpTargets` (the recap's band grouping) previously shipped
 * executed-but-never-asserted; this pins the ACTUAL banded recap text for BOTH
 * the plain and llm formatters, and locks the unified Global/Project vocabulary
 * (the recap no longer says MACHINE/PROJECT). The setup formatters use no
 * colour, so no chalk level dance is needed.
 */

import { describe, expect, it } from "vitest";
import { setupFormatters } from "./setup.render.js";
import type { SetupResult } from "./types.js";

/** A two-band MCP result: a global (Windsurf) and a project (Cursor) target. */
const BOTH_BANDS: SetupResult = {
  kind: "mcp",
  configured: ["Cursor", "Windsurf"],
  targets: [
    {
      name: "Windsurf",
      band: "global",
      path: "/home/u/.codeium/windsurf/mcp_config.json",
    },
    { name: "Cursor", band: "project", path: "/proj/.cursor/mcp.json" },
  ],
};

describe("setup render — MCP recap banded by Global/Project", () => {
  it("plain lists the global band before the project band", () => {
    expect(setupFormatters.plain(BOTH_BANDS)).toBe(
      "Configured MCP — Global: Windsurf · Project: Cursor.",
    );
  });

  it("llm is the same banded recap prefixed with a bullet", () => {
    expect(setupFormatters.llm(BOTH_BANDS)).toBe(
      "- Configured MCP — Global: Windsurf · Project: Cursor.",
    );
  });

  it("uses the unified labels, never MACHINE/PROJECT", () => {
    const out = setupFormatters.plain(BOTH_BANDS);
    expect(out).not.toContain("MACHINE");
    expect(out).not.toContain("PROJECT");
  });

  it("a single-band selection lists only that band", () => {
    const projectOnly: SetupResult = {
      kind: "mcp",
      configured: ["Cursor"],
      targets: [
        { name: "Cursor", band: "project", path: "/p/.cursor/mcp.json" },
      ],
    };
    expect(setupFormatters.plain(projectOnly)).toBe(
      "Configured MCP — Project: Cursor.",
    );
  });

  it("no targets → a plain 'nothing configured' line", () => {
    const none: SetupResult = { kind: "mcp", configured: [], targets: [] };
    expect(setupFormatters.plain(none)).toBe("No harnesses configured.");
  });

  it("json is the exact SetupResult round-trip", () => {
    expect(JSON.parse(setupFormatters.json(BOTH_BANDS))).toEqual(BOTH_BANDS);
  });
});
