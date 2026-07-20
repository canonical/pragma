/**
 * Render goldens for `pragma doctor` — the band-grouped report.
 *
 * The banded MACHINE/PROJECT grouping (`partitionByBand` → sections) previously
 * shipped executed-but-never-asserted; this pins the ACTUAL banded output text
 * for BOTH the plain and llm formatters, and locks the unified Global/Project
 * vocabulary (the report no longer says MACHINE/PROJECT). Forces `chalk.level =
 * 0` for deterministic, color-free output (the colophon-render pattern).
 */

import chalk from "chalk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { doctorFormatters } from "./doctor.render.js";
import type { DoctorData } from "./types.js";

/** A fixture spanning all three groups: environment (no band), global, project. */
const DATA: DoctorData = {
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

let prevLevel: number;
beforeAll(() => {
  prevLevel = chalk.level;
  chalk.level = 0; // color-free ⇒ deterministic text
});
afterAll(() => {
  chalk.level = prevLevel;
});

describe("doctor render — banded plain report", () => {
  it("groups checks under Global then Project headers (unified labels)", () => {
    const out = doctorFormatters.plain(DATA);
    const lines = out.split("\n");
    // The two banded section headers use the unified Global/Project vocabulary.
    expect(lines).toContain("Global");
    expect(lines).toContain("Project");
    // The superseded MACHINE/PROJECT labels are gone.
    expect(out).not.toContain("MACHINE");
    expect(out).not.toMatch(/^PROJECT$/m);
  });

  it("orders environment → Global → Project, banding each check correctly", () => {
    const out = doctorFormatters.plain(DATA);
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
    const out = doctorFormatters.llm(DATA);
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
    expect(JSON.parse(doctorFormatters.json(DATA))).toEqual(DATA);
  });
});
