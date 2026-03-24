import { describe, expect, it } from "vitest";
import type { DiscoveredSkill, SkillSource } from "../types.js";
import formatters from "./list.js";

const MOCK_SKILLS: readonly DiscoveredSkill[] = [
  {
    name: "design-audit",
    description: "Audit a component against DS specs",
    sourcePath: "node_modules/@canonical/ds-global/skills/design-audit",
    sourcePackage: "@canonical/ds-global",
    folderName: "design-audit",
    frontmatter: {
      name: "design-audit",
      description: "Audit a component against DS specs",
      metadata: { author: "canonical" },
    },
  },
  {
    name: "scaffold-story",
    description: "Generate a Storybook story from anatomy",
    sourcePath: "/tmp/node_modules/@canonical/pragma-cli/skills/scaffold-story",
    sourcePackage: "@canonical/pragma-cli",
    folderName: "scaffold-story",
    frontmatter: {
      name: "scaffold-story",
      description: "Generate a Storybook story from anatomy",
    },
  },
];

const MOCK_SOURCES: readonly SkillSource[] = [
  {
    path: "node_modules/@canonical/ds-global/skills",
    packageName: "@canonical/ds-global",
    available: true,
  },
  {
    path: "node_modules/@canonical/anatomy-dsl/skills",
    packageName: "@canonical/anatomy-dsl",
    available: false,
  },
  {
    path: "/tmp/node_modules/@canonical/pragma-cli/skills",
    packageName: "@canonical/pragma-cli",
    available: true,
  },
];

describe("skill list formatters", () => {
  describe("plain", () => {
    it("groups skills by source package", () => {
      const output = formatters.plain({
        skills: MOCK_SKILLS,
        sources: MOCK_SOURCES,
        detailed: false,
      });
      expect(output).toContain("@canonical/ds-global");
      expect(output).toContain("@canonical/pragma-cli");
      expect(output).toContain("design-audit");
      expect(output).toContain("scaffold-story");
    });

    it("shows unavailable sources", () => {
      const output = formatters.plain({
        skills: MOCK_SKILLS,
        sources: MOCK_SOURCES,
        detailed: false,
      });
      expect(output).toContain("@canonical/anatomy-dsl not installed");
    });

    it("shows total count", () => {
      const output = formatters.plain({
        skills: MOCK_SKILLS,
        sources: MOCK_SOURCES,
        detailed: false,
      });
      expect(output).toContain("2 skills from 2 packages");
    });

    it("shows metadata when detailed", () => {
      const output = formatters.plain({
        skills: MOCK_SKILLS,
        sources: MOCK_SOURCES,
        detailed: true,
      });
      expect(output).toContain("Author");
      expect(output).toContain("canonical");
      expect(output).toContain("Source:");
    });
  });

  describe("llm", () => {
    it("renders markdown with heading", () => {
      const output = formatters.llm({
        skills: MOCK_SKILLS,
        sources: MOCK_SOURCES,
        detailed: false,
      });
      expect(output).toContain("## Skills");
      expect(output).toContain("### @canonical/ds-global");
      expect(output).toContain("**design-audit**");
    });

    it("notes unavailable sources", () => {
      const output = formatters.llm({
        skills: MOCK_SKILLS,
        sources: MOCK_SOURCES,
        detailed: false,
      });
      expect(output).toContain("*Not installed: @canonical/anatomy-dsl*");
    });
  });

  describe("json", () => {
    it("produces valid JSON array", () => {
      const output = formatters.json({
        skills: MOCK_SKILLS,
        sources: MOCK_SOURCES,
        detailed: false,
      });
      const parsed = JSON.parse(output);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBe("design-audit");
      expect(parsed[0].source).toBe("@canonical/ds-global");
    });
  });

  describe("empty skills", () => {
    it("handles no skills gracefully", () => {
      const output = formatters.plain({
        skills: [],
        sources: MOCK_SOURCES,
        detailed: false,
      });
      expect(output).toContain("0 skills from 0 packages");
    });
  });
});
