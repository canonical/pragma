import { describe, expect, it } from "vitest";
import type { SetupSkillsResult } from "../types.js";
import formatters from "./skills.js";

const MOCK_RESULT: SetupSkillsResult = {
  actions: [
    {
      skillName: "design-audit",
      target: "/project/node_modules/@canonical/ds-global/skills/design-audit",
      linkPath: "/project/.claude/skills/design-audit",
      action: "created",
      harnessName: "Claude Code",
    },
    {
      skillName: "scaffold-story",
      target:
        "/project/node_modules/@canonical/pragma-cli/skills/scaffold-story",
      linkPath: "/project/.claude/skills/scaffold-story",
      action: "created",
      harnessName: "Claude Code",
    },
    {
      skillName: "design-audit",
      target: "/project/node_modules/@canonical/ds-global/skills/design-audit",
      linkPath: "/project/.cursor/skills/design-audit",
      action: "skipped",
      harnessName: "Cursor",
    },
  ],
  harnessCount: 2,
  skillCount: 2,
  warnings: [],
};

describe("setup skills formatters", () => {
  describe("plain", () => {
    it("shows created symlinks grouped by harness", () => {
      const output = formatters.plain({
        result: MOCK_RESULT,
        dryRun: false,
      });
      expect(output).toContain("Created 2 symlinks for Claude Code");
      expect(output).toContain("1 existing symlink unchanged");
    });

    it("uses dry-run prefix", () => {
      const output = formatters.plain({
        result: MOCK_RESULT,
        dryRun: true,
      });
      expect(output).toContain("Would create 2 symlinks");
    });

    it("shows replacement warnings", () => {
      const result: SetupSkillsResult = {
        ...MOCK_RESULT,
        actions: [
          {
            skillName: "design-audit",
            target: "/new/target",
            linkPath: "/project/.claude/skills/design-audit",
            action: "replaced",
            harnessName: "Claude Code",
          },
        ],
        warnings: ["Replaced existing symlink for design-audit in Claude Code"],
      };
      const output = formatters.plain({ result, dryRun: false });
      expect(output).toContain("Replaced symlink for design-audit");
    });
  });

  describe("llm", () => {
    it("renders markdown", () => {
      const output = formatters.llm({
        result: MOCK_RESULT,
        dryRun: false,
      });
      expect(output).toContain("## Setup Skills");
      expect(output).toContain("**design-audit**");
    });

    it("uses dry-run verb", () => {
      const output = formatters.llm({
        result: MOCK_RESULT,
        dryRun: true,
      });
      expect(output).toContain("Would symlink");
    });
  });

  describe("json", () => {
    it("produces valid JSON", () => {
      const output = formatters.json({
        result: MOCK_RESULT,
        dryRun: false,
      });
      const parsed = JSON.parse(output);
      expect(parsed.harnessCount).toBe(2);
      expect(parsed.actions).toHaveLength(3);
    });
  });
});
