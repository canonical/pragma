import { describe, expect, it } from "vitest";
import type { DoctorData } from "../operations/types.js";
import formatters from "./doctor.js";

const allPass: DoctorData = {
  checks: [
    { name: "Node version", status: "pass", detail: "v24.1.0" },
    {
      name: "pragma version",
      status: "pass",
      detail: "v0.18.0 (installed via bun, global)",
    },
    { name: "pragma.config.json", status: "pass", detail: "found" },
    {
      name: "ke store",
      status: "pass",
      detail: "12,847 triples in 180ms",
    },
  ],
  passed: 4,
  failed: 0,
  skipped: 0,
};

const mixed: DoctorData = {
  checks: [
    { name: "Node version", status: "pass", detail: "v24.1.0" },
    {
      name: "pragma.config.json",
      status: "fail",
      detail: "not found",
      remedy: "pragma config tier <tier>",
    },
    {
      name: "terrazzo-lsp",
      status: "skip",
      detail: "no tokens.config.mjs found",
    },
    {
      name: "Shell completions",
      status: "fail",
      detail: "not installed",
      remedy: "pragma setup completions",
    },
  ],
  passed: 1,
  failed: 2,
  skipped: 1,
};

describe("doctor formatters", () => {
  describe("plain", () => {
    it("renders passing checks with ✓", () => {
      const output = formatters.plain(allPass);
      expect(output).toContain("✓");
      expect(output).toContain("Node version");
      expect(output).toContain("v24.1.0");
    });

    it("renders failing checks with ✗ and remedies at the bottom", () => {
      const output = formatters.plain(mixed);
      expect(output).toContain("✗");
      expect(output).toContain("pragma config tier <tier>");
      expect(output).toContain("pragma setup completions");
    });

    it("renders skipped checks with ○", () => {
      const output = formatters.plain(mixed);
      expect(output).toContain("○");
      expect(output).toContain("terrazzo-lsp");
    });

    it("does not render remedies section when all pass", () => {
      const output = formatters.plain(allPass);
      expect(output).not.toContain("Run ");
    });
  });

  describe("llm", () => {
    it("renders Markdown with ## Doctor heading", () => {
      const output = formatters.llm(allPass);
      expect(output).toContain("## Doctor");
    });

    it("renders checks as bullet list", () => {
      const output = formatters.llm(allPass);
      expect(output).toContain("- ✓ **Node version**: v24.1.0");
    });

    it("includes remedial section for failures", () => {
      const output = formatters.llm(mixed);
      expect(output).toContain("### Remedial");
      expect(output).toContain("`pragma config tier <tier>`");
      expect(output).toContain("`pragma setup completions`");
    });
  });

  describe("json", () => {
    it("returns valid JSON matching the data shape", () => {
      const output = formatters.json(allPass);
      const parsed = JSON.parse(output);
      expect(parsed.passed).toBe(4);
      expect(parsed.failed).toBe(0);
      expect(parsed.checks).toHaveLength(4);
    });

    it("includes remedy fields for failed checks", () => {
      const output = formatters.json(mixed);
      const parsed = JSON.parse(output);
      const failedChecks = parsed.checks.filter(
        (c: { status: string }) => c.status === "fail",
      );
      expect(failedChecks).toHaveLength(2);
      expect(failedChecks[0].remedy).toBeDefined();
    });
  });
});
