import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SkillSource } from "../helpers/index.js";
import discoverSkills from "./discover.js";

const TMP_ROOT = join(tmpdir(), `pragma-skill-discover-${Date.now()}`);

/** Test skill sources that mirror the real package layout. */
const TEST_SOURCES: SkillSource[] = [
  {
    dir: join(TMP_ROOT, "node_modules/@canonical/design-system/skills"),
    packageName: "@canonical/design-system",
    relativePath: "node_modules/@canonical/design-system/skills",
  },
  {
    dir: join(TMP_ROOT, "node_modules/@canonical/anatomy-dsl/skills"),
    packageName: "@canonical/anatomy-dsl",
    relativePath: "node_modules/@canonical/anatomy-dsl/skills",
  },
  {
    dir: join(TMP_ROOT, "node_modules/@canonical/pragma/skills"),
    packageName: "@canonical/pragma",
    relativePath: "node_modules/@canonical/pragma/skills",
  },
];

function writeSkillMd(
  source: SkillSource,
  skillName: string,
  content: string,
): void {
  const dir = join(source.dir, skillName);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), content);
}

beforeAll(() => {
  mkdirSync(TMP_ROOT, { recursive: true });

  writeSkillMd(
    TEST_SOURCES[0],
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
    TEST_SOURCES[0],
    "ds-review",
    `---
name: ds-review
description: Review a PR for DS compliance
---
`,
  );

  writeSkillMd(
    TEST_SOURCES[2],
    "scaffold-story",
    `---
name: scaffold-story
description: Generate a Storybook story from anatomy
---
`,
  );

  // Invalid frontmatter — should be skipped with warning
  writeSkillMd(
    TEST_SOURCES[2],
    "broken-skill",
    `---
name: broken-skill
---
`,
  );

  // File without SKILL.md — should be skipped
  const noSkillDir = join(TEST_SOURCES[0].dir, "no-skill-md");
  mkdirSync(noSkillDir, { recursive: true });
  writeFileSync(join(noSkillDir, "README.md"), "Not a skill");
});

afterAll(() => {
  rmSync(TMP_ROOT, { recursive: true, force: true });
});

describe("discoverSkills", () => {
  it("discovers skills from available sources", async () => {
    const skills = await discoverSkills(TMP_ROOT, TEST_SOURCES);
    const names = skills.map((s) => s.name);
    expect(names).toContain("design-audit");
    expect(names).toContain("ds-review");
    expect(names).toContain("scaffold-story");
  });

  it("skips missing source directories", async () => {
    // TEST_SOURCES[1] (anatomy-dsl) was not created
    const skills = await discoverSkills(TMP_ROOT, TEST_SOURCES);
    const packages = [...new Set(skills.map((s) => s.sourcePackage))];
    expect(packages).not.toContain("@canonical/anatomy-dsl");
  });

  it("skips folders without SKILL.md", async () => {
    const skills = await discoverSkills(TMP_ROOT, TEST_SOURCES);
    const names = skills.map((s) => s.name);
    expect(names).not.toContain("no-skill-md");
  });

  it("skips skills with invalid frontmatter", async () => {
    const skills = await discoverSkills(TMP_ROOT, TEST_SOURCES);
    const names = skills.map((s) => s.name);
    expect(names).not.toContain("broken-skill");
  });

  it("populates source metadata correctly", async () => {
    const skills = await discoverSkills(TMP_ROOT, TEST_SOURCES);
    const audit = skills.find((s) => s.name === "design-audit");
    expect(audit?.sourcePackage).toBe("@canonical/design-system");
    expect(audit?.folderName).toBe("design-audit");
    expect(audit?.sourcePath).toBe(
      `${TEST_SOURCES[0].relativePath}/design-audit`,
    );
  });

  it("preserves frontmatter metadata", async () => {
    const skills = await discoverSkills(TMP_ROOT, TEST_SOURCES);
    const audit = skills.find((s) => s.name === "design-audit");
    expect(audit?.frontmatter.metadata).toEqual({ author: "canonical" });
  });

  it("returns empty array when no sources available", async () => {
    const emptySources: SkillSource[] = [
      {
        dir: "/nonexistent/path/skills",
        packageName: "@canonical/nope",
        relativePath: "node_modules/@canonical/nope/skills",
      },
    ];
    const skills = await discoverSkills("/nonexistent", emptySources);
    expect(skills).toEqual([]);
  });
});
