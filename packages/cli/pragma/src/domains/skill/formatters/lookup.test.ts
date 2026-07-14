import { describe, expect, it } from "vitest";
import type { SkillDetailed } from "../types.js";
import formatters from "./lookup.js";

const skill: SkillDetailed = {
  name: "design-auditor",
  description: "Audit design system coverage",
  sourcePath: "/pkgs/design-system/skills/design-auditor",
  sourcePackage: "@canonical/design-system",
  folderName: "design-auditor",
  frontmatter: {
    name: "design-auditor",
    description: "Audit design system coverage",
  },
  content: "---\nname: design-auditor\n---\n\n# Design Auditor\n",
  files: ["AUDIT_SPEC.md"],
};

describe("skill lookup formatters", () => {
  it("plain renders a header and the full content", () => {
    const text = formatters.plain(skill);
    expect(text).toContain("design-auditor");
    expect(text).toContain("@canonical/design-system");
    expect(text).toContain("Companion files: AUDIT_SPEC.md");
    expect(text).toContain("# Design Auditor");
  });

  it("llm renders a markdown header above the content", () => {
    const text = formatters.llm(skill);
    expect(text).toContain("## Skill: design-auditor");
    expect(text).toContain("**Companion files:** AUDIT_SPEC.md");
    expect(text).toContain("# Design Auditor");
  });

  it("llm omits the companion files line when there are none", () => {
    const text = formatters.llm({ ...skill, files: [] });
    expect(text).not.toContain("Companion files");
  });

  it("json serializes the skill with content and files", () => {
    const data = JSON.parse(formatters.json(skill)) as Record<string, unknown>;
    expect(data.name).toBe("design-auditor");
    expect(data.files).toEqual(["AUDIT_SPEC.md"]);
    expect(data.content).toContain("# Design Auditor");
  });
});
