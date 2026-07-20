/**
 * Render goldens for `pragma doctor` — the band-grouped report AND the plain-path
 * color gate (F1).
 *
 * The banded Global/Project grouping (`partitionByBand` → sections) is pinned for
 * both the plain and llm formatters, locking the unified Global/Project
 * vocabulary (the report no longer says MACHINE/PROJECT). Separately, the plain
 * formatter tints ONLY on a color-capable TTY: `supports-color` reports a
 * non-zero `chalk.level` off a TTY under `GITHUB_ACTIONS` / `FORCE_COLOR`, so the
 * `isTTY` gate (via the shared style seam) keeps ANSI out of
 * `doctor --format plain | tee`. `beforeEach` forces color OFF so the banded
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
      detail: "zsh installed and resolving",
      band: "global",
    },
    {
      name: "MCP configured",
      status: "fail",
      detail: "detected Windsurf but pragma not configured",
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
  failed: 1,
  skipped: 1,
};

/** A fixture spanning pass/fail/skip, sub-items, and a remedy — every color path. */
const COLOR_DATA: DoctorData = {
  checks: [
    { name: "Node version", status: "pass", detail: "v24" },
    {
      name: "package refs",
      status: "fail",
      detail: "3 configured, 0 locked",
      items: [
        { label: "core", status: "fail", detail: "unlocked" },
        { label: "ui", status: "fail", detail: "unlocked" },
      ],
      remedy: "pragma sources update",
    },
    { name: "Skills symlinked", status: "skip", detail: "no harness" },
  ],
  passed: 1,
  failed: 1,
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

describe("doctor render — banded plain report", () => {
  it("groups checks under Global then Project headers (unified labels)", () => {
    const out = doctorFormatters.plain(BANDED_DATA);
    const lines = out.split("\n");
    // The two banded section headers use the unified Global/Project vocabulary.
    expect(lines).toContain("Global");
    expect(lines).toContain("Project");
    // The superseded MACHINE/PROJECT labels are gone.
    expect(out).not.toContain("MACHINE");
    expect(out).not.toMatch(/^PROJECT$/m);
  });

  it("orders environment → Global → Project, banding each check correctly", () => {
    const out = doctorFormatters.plain(BANDED_DATA);
    // Environment check leads with no header; the two global-band checks sit
    // under Global; the project-band check sits under Project.
    const at = (needle: string): number => out.indexOf(needle);
    expect(at("Node version")).toBeGreaterThanOrEqual(0);
    expect(at("Node version")).toBeLessThan(at("Global"));
    expect(at("Global")).toBeLessThan(at("Shell completions"));
    expect(at("MCP configured")).toBeLessThan(at("Project"));
    expect(at("Project")).toBeLessThan(at("Skills symlinked"));
    // A failing banded check keeps its inline remedy under its band.
    expect(out).toContain("fix: pragma setup mcp");
    // The tally closes the report.
    expect(out).toContain("2 passed");
  });
});

describe("doctor render — banded llm report", () => {
  it("groups checks under ### Global then ### Project headers", () => {
    const out = doctorFormatters.llm(BANDED_DATA);
    expect(out).toContain("### Global");
    expect(out).toContain("### Project");
    expect(out).not.toContain("### Machine");
    const at = (needle: string): number => out.indexOf(needle);
    // Environment leads (no section header), then the two banded sections.
    expect(at("Node version")).toBeLessThan(at("### Global"));
    expect(at("### Global")).toBeLessThan(at("Shell completions"));
    expect(at("Shell completions")).toBeLessThan(at("### Project"));
    expect(at("### Project")).toBeLessThan(at("Skills symlinked"));
    expect(out).toContain("_2 passed, 1 failed, 1 skipped_");
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
      expect(out).toContain("✗  package refs");
      expect(out).toContain("○  Skills symlinked");
      expect(out).toContain("↳ fix: pragma sources update");
      expect(out).toContain("  1 passed · 1 failed · 1 skipped");
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
