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
      name: "skills",
      status: "skip",
      detail: "no harnesses detected",
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

const withItems: DoctorData = {
  checks: [
    {
      name: "package refs",
      status: "pass",
      detail: "1 package resolved",
      items: [
        {
          label: "@canonical/design-system",
          status: "pass",
          detail: "git v0.1.2 · 362 graphs, 3 skills",
        },
      ],
    },
  ],
  passed: 1,
  failed: 0,
  skipped: 0,
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
      expect(output).toContain("skills");
    });

    it("does not render remedies section when all pass", () => {
      const output = formatters.plain(allPass);
      expect(output).not.toContain("Run ");
    });

    it("renders a summary tally", () => {
      const output = formatters.plain(mixed);
      expect(output).toContain("1 passed");
      expect(output).toContain("2 failed");
      expect(output).toContain("1 skipped");
    });

    it("renders sub-items indented under a check", () => {
      const output = formatters.plain(withItems);
      expect(output).toContain("@canonical/design-system");
      expect(output).toContain("git v0.1.2 · 362 graphs, 3 skills");
      // sub-item lines are indented beneath the check headline
      const lines = output.split("\n");
      const sub = lines.find((l) => l.includes("@canonical/design-system"));
      expect(sub?.startsWith("     ")).toBe(true);
    });

    it("renders the remedy inline with a fix label", () => {
      const output = formatters.plain(mixed);
      expect(output).toContain("fix:");
      expect(output).toContain("pragma config tier <tier>");
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

    it("includes inline fixes for failures", () => {
      const output = formatters.llm(mixed);
      expect(output).toContain("_fix:_");
      expect(output).toContain("`pragma config tier <tier>`");
      expect(output).toContain("`pragma setup completions`");
    });

    it("renders sub-items as nested bullets", () => {
      const output = formatters.llm(withItems);
      expect(output).toContain("  - ✓ @canonical/design-system");
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
