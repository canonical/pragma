/**
 * Render goldens for `pragma doctor` — the scope-grouped report AND the
 * plain-path color gate (F1).
 *
 * The Global / Local project grouping (`partitionByBand` → sections) is pinned
 * for both the plain and llm formatters, locking the vocabulary the flags
 * already use — `--global` and `--local`. It is neither MACHINE/PROJECT (the
 * first spelling) nor "band" (the second): "band" is this repository's word for
 * the partition and nobody else's. Separately, the plain
 * formatter tints ONLY on a color-capable TTY: `supports-color` reports a
 * non-zero `chalk.level` off a TTY under `GITHUB_ACTIONS` / `FORCE_COLOR`, so the
 * `isTTY` gate (via the shared style seam) keeps ANSI out of
 * `doctor --format plain | tee`. `beforeEach` forces color OFF so the section
 * goldens stay deterministic; the color tests opt a level back in explicitly.
 */

import chalk from "chalk";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { doctorFormatters } from "./doctor.render.js";
import type { DoctorData } from "./types.js";

/** A fixture spanning all three groups: environment (no band), global, project. */
const BANDED_DATA: DoctorData = {
  checks: [
    { name: "Node version", status: "pass", detail: "v20 detected" },
    {
      name: "Shell completions",
      status: "pass",
      detail: "zsh up to date and resolving",
      band: "global",
    },
    {
      name: "MCP configured",
      status: "available",
      detail: "not set up for Windsurf",
      remedy: "pragma setup mcp",
      band: "global",
    },
    {
      name: "Skills symlinked",
      status: "skip",
      detail: "no AI harnesses detected",
      band: "project",
    },
  ],
  passed: 2,
  failed: 0,
  available: 1,
  skipped: 1,
};

/** A fixture spanning every status tier, sub-items, and remedies — every color path. */
const COLOR_DATA: DoctorData = {
  checks: [
    { name: "Node version", status: "pass", detail: "v24" },
    {
      name: "pack refs",
      status: "fail",
      detail: "packs are configured but the store has not been built",
      items: [
        { label: "core", status: "fail", detail: "not built" },
        { label: "ui", status: "fail", detail: "not built" },
      ],
      remedy: "pragma sources update",
    },
    {
      name: "Shell completions",
      status: "available",
      detail: "resolver OK; zsh script not installed",
      remedy: "pragma setup completions",
    },
    { name: "Skills symlinked", status: "skip", detail: "no harness" },
  ],
  passed: 1,
  failed: 1,
  available: 1,
  skipped: 1,
};

/** Run `body` with stdout's `isTTY` forced to `value`, then restore it. */
function withStdoutTty(value: boolean | undefined, body: () => void): void {
  const stream = process.stdout as { isTTY?: boolean };
  const saved = stream.isTTY;
  stream.isTTY = value;
  try {
    body();
  } finally {
    stream.isTTY = saved;
  }
}

let prevLevel: number;
beforeAll(() => {
  prevLevel = chalk.level;
});
beforeEach(() => {
  chalk.level = 0; // color-free ⇒ deterministic text (color tests opt back in)
});
afterAll(() => {
  chalk.level = prevLevel;
});

describe("doctor render — scoped plain report", () => {
  it("groups checks under Global then Local project headers", () => {
    const out = doctorFormatters.plain(BANDED_DATA);
    const lines = out.split("\n");
    // The two section headers use the words the flags use.
    expect(lines).toContain("Global");
    expect(lines).toContain("Local project");
    // The superseded MACHINE/PROJECT labels are gone — and so is "band", which
    // no user-facing string in this report may say.
    expect(out).not.toContain("MACHINE");
    expect(out).not.toMatch(/^PROJECT$/m);
    expect(out).not.toMatch(/\bbands?\b/);
  });

  it("orders environment → Global → Local project, placing each check correctly", () => {
    const out = doctorFormatters.plain(BANDED_DATA);
    // Environment check leads with no header; the two global checks sit under
    // Global; the per-project check sits under Local project.
    const at = (needle: string): number => out.indexOf(needle);
    expect(at("Node version")).toBeGreaterThanOrEqual(0);
    expect(at("Node version")).toBeLessThan(at("Global"));
    expect(at("Global")).toBeLessThan(at("Shell completions"));
    expect(at("MCP configured")).toBeLessThan(at("Local project"));
    expect(at("Local project")).toBeLessThan(at("Skills symlinked"));
    // An available banded check keeps its inline setup command under its band.
    expect(out).toContain("fix: pragma setup mcp");
    // The tally closes the report.
    expect(out).toContain("2 passed");
  });
});

describe("doctor render — scoped llm report", () => {
  it("groups checks under ### Global then ### Local project headers", () => {
    const out = doctorFormatters.llm(BANDED_DATA);
    expect(out).toContain("### Global");
    expect(out).toContain("### Local project");
    expect(out).not.toContain("### Machine");
    const at = (needle: string): number => out.indexOf(needle);
    // Environment leads (no section header), then the two scoped sections.
    expect(at("Node version")).toBeLessThan(at("### Global"));
    expect(at("### Global")).toBeLessThan(at("Shell completions"));
    expect(at("Shell completions")).toBeLessThan(at("### Local project"));
    expect(at("### Local project")).toBeLessThan(at("Skills symlinked"));
    expect(out).toContain("_2 passed, 0 failed, 1 available, 1 skipped_");
  });
});

describe("doctor render — json", () => {
  it("is the exact DoctorData round-trip", () => {
    expect(JSON.parse(doctorFormatters.json(BANDED_DATA))).toEqual(BANDED_DATA);
  });
});

describe("doctor render — piped output is ANSI-free (F1)", () => {
  it("plain emits ZERO ANSI off a TTY even when chalk reports color (CI/FORCE_COLOR)", () => {
    chalk.level = 3;
    withStdoutTty(undefined, () => {
      const out = doctorFormatters.plain(COLOR_DATA);
      // biome-ignore lint/suspicious/noControlCharactersInRegex: asserting NO ESC byte survives
      expect(out).not.toMatch(/\x1b\[/);
      // The structural, color-free content still renders (glyphs, names, remedy).
      expect(out).toContain("pragma doctor");
      expect(out).toContain("✓  Node version");
      expect(out).toContain("✗  pack refs");
      expect(out).toContain("◇  Shell completions");
      expect(out).toContain("○  Skills symlinked");
      expect(out).toContain("↳ fix: pragma sources update");
      // The available tier keeps its setup command inline, like a fail's fix.
      expect(out).toContain("↳ fix: pragma setup completions");
      expect(out).toContain("  1 passed · 1 failed · 1 available · 1 skipped");
    });
  });
});

describe("doctor render — color ON (attended TTY)", () => {
  it("plain tints the output on a color-capable TTY", () => {
    chalk.level = 1;
    withStdoutTty(true, () => {
      // biome-ignore lint/suspicious/noControlCharactersInRegex: asserting the literal ESC byte is the point
      expect(doctorFormatters.plain(COLOR_DATA)).toMatch(/\x1b\[/);
    });
  });
});

/**
 * The harness inventory renders through the EXISTING check-with-items
 * primitive — a listing needs no new machinery, only a check whose `items` are
 * harnesses. This pins that it reads as an inventory in both formats: named
 * harnesses under their scope, mixed per-item glyphs, and NO `fix:` line (the
 * `mcp`/`skills` rows own every action a harness can need).
 */
const INVENTORY_DATA: DoctorData = {
  checks: [
    {
      name: "harnesses",
      status: "pass",
      detail: "1 detected · 1 registered · 3 known",
      band: "global",
      items: [
        {
          label: "Claude Code",
          status: "pass",
          detail: "registered — ~/.claude.json",
        },
        { label: "Cursor", status: "skip", detail: "not detected" },
        {
          label: "VS Code",
          status: "skip",
          detail: "keeps no global config",
        },
      ],
    },
  ],
  passed: 1,
  failed: 0,
  available: 0,
  skipped: 0,
};

describe("doctor render — the harness inventory", () => {
  it("renders one aligned sub-item per harness, with no fix line", () => {
    const out = doctorFormatters.plain(INVENTORY_DATA);
    expect(out).toContain("Global");
    expect(out).toContain("harnesses");
    expect(out).toContain("1 detected · 1 registered · 3 known");
    expect(out).toContain("· ✓ Claude Code  registered — ~/.claude.json");
    expect(out).toContain("· ○ Cursor       not detected");
    expect(out).toContain("· ○ VS Code      keeps no global config");
    // A listing proposes nothing — and never renders a failure glyph.
    expect(out).not.toContain("fix:");
    expect(out).not.toContain("✗");
  });

  it("nests the harnesses under the check in the llm format", () => {
    const out = doctorFormatters.llm(INVENTORY_DATA);
    expect(out).toContain("### Global");
    expect(out).toContain(
      "- ✓ **harnesses**: 1 detected · 1 registered · 3 known",
    );
    expect(out).toContain("  - ✓ Claude Code: registered — ~/.claude.json");
    expect(out).toContain("  - ○ VS Code: keeps no global config");
    expect(out).not.toContain("_fix:_");
  });

  it("round-trips through json with every row intact", () => {
    const parsed = JSON.parse(
      doctorFormatters.json(INVENTORY_DATA),
    ) as DoctorData;
    expect(parsed).toEqual(INVENTORY_DATA);
    expect(parsed.checks[0]?.items).toHaveLength(3);
  });
});
