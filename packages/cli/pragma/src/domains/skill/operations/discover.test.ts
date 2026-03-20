import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SKILL_SOURCES } from "../constants.js";
import discoverSkills from "./discover.js";

const TMP_ROOT = join(tmpdir(), `pragma-skill-discover-${Date.now()}`);

function writeSkillMd(
  source: string,
  skillName: string,
  content: string,
): void {
  const dir = join(TMP_ROOT, source, skillName);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), content);
}

beforeAll(() => {
  mkdirSync(TMP_ROOT, { recursive: true });

  writeSkillMd(
    SKILL_SOURCES[0],
    "design-audit",
    `---
name: design-audit
description: Audit a component against DS specs
metadata:
  author: canonical
---

# Design Audit
`,
  );

  writeSkillMd(
    SKILL_SOURCES[0],
    "ds-review",
    `---
name: ds-review
description: Review a PR for DS compliance
---
`,
  );

  writeSkillMd(
    SKILL_SOURCES[2],
    "scaffold-story",
    `---
name: scaffold-story
description: Generate a Storybook story from anatomy
---
`,
  );

  // Invalid frontmatter — should be skipped with warning
  writeSkillMd(
    SKILL_SOURCES[2],
    "broken-skill",
    `---
name: broken-skill
---
`,
  );

  // File without SKILL.md — should be skipped
  const noSkillDir = join(TMP_ROOT, SKILL_SOURCES[0], "no-skill-md");
  mkdirSync(noSkillDir, { recursive: true });
  writeFileSync(join(noSkillDir, "README.md"), "Not a skill");
});

afterAll(() => {
  rmSync(TMP_ROOT, { recursive: true, force: true });
});

describe("discoverSkills", () => {
  it("discovers skills from available sources", async () => {
    const skills = await discoverSkills(TMP_ROOT);
    const names = skills.map((s) => s.name);
    expect(names).toContain("design-audit");
    expect(names).toContain("ds-review");
    expect(names).toContain("scaffold-story");
  });

  it("skips missing source directories", async () => {
    // SKILL_SOURCES[1] (anatomy-dsl) was not created
    const skills = await discoverSkills(TMP_ROOT);
    const packages = [...new Set(skills.map((s) => s.sourcePackage))];
    expect(packages).not.toContain("@canonical/anatomy-dsl");
  });

  it("skips folders without SKILL.md", async () => {
    const skills = await discoverSkills(TMP_ROOT);
    const names = skills.map((s) => s.name);
    expect(names).not.toContain("no-skill-md");
  });

  it("skips skills with invalid frontmatter", async () => {
    const skills = await discoverSkills(TMP_ROOT);
    const names = skills.map((s) => s.name);
    expect(names).not.toContain("broken-skill");
  });

  it("populates source metadata correctly", async () => {
    const skills = await discoverSkills(TMP_ROOT);
    const audit = skills.find((s) => s.name === "design-audit");
    expect(audit?.sourcePackage).toBe("@canonical/ds-global");
    expect(audit?.folderName).toBe("design-audit");
    expect(audit?.sourcePath).toBe(`${SKILL_SOURCES[0]}/design-audit`);
  });

  it("preserves frontmatter metadata", async () => {
    const skills = await discoverSkills(TMP_ROOT);
    const audit = skills.find((s) => s.name === "design-audit");
    expect(audit?.frontmatter.metadata).toEqual({ author: "canonical" });
  });

  it("returns empty array when no sources available", async () => {
    const skills = await discoverSkills("/nonexistent/path");
    expect(skills).toEqual([]);
  });
});
