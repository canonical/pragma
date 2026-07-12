import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SkillSource } from "../helpers/index.js";
import discoverSkills from "./discover.js";

const TMP_ROOT = join(tmpdir(), `pragma-skill-discover-${Date.now()}`);

/**
 * Test skill sources that mirror the real loader granularity: each source
 * is one skill directory (`<package>/skills/<name>`) containing SKILL.md,
 * as produced by `readPackageDir`.
 */
const TEST_SOURCES: SkillSource[] = [
  {
    dir: join(
      TMP_ROOT,
      "node_modules/@canonical/design-system/skills/design-audit",
    ),
    packageName: "@canonical/design-system",
  },
  {
    dir: join(
      TMP_ROOT,
      "node_modules/@canonical/design-system/skills/ds-review",
    ),
    packageName: "@canonical/design-system",
  },
  {
    dir: join(
      TMP_ROOT,
      "node_modules/@canonical/anatomy-dsl/skills/anatomy-author",
    ),
    packageName: "@canonical/anatomy-dsl",
  },
  {
    dir: join(
      TMP_ROOT,
      "node_modules/@canonical/pragma-cli/skills/scaffold-story",
    ),
    packageName: "@canonical/pragma-cli",
  },
  {
    dir: join(
      TMP_ROOT,
      "node_modules/@canonical/pragma-cli/skills/broken-skill",
    ),
    packageName: "@canonical/pragma-cli",
  },
  {
    dir: join(
      TMP_ROOT,
      "node_modules/@canonical/design-system/skills/no-skill-md",
    ),
    packageName: "@canonical/design-system",
  },
];

function writeSkillMd(source: SkillSource, content: string): void {
  mkdirSync(source.dir, { recursive: true });
  writeFileSync(join(source.dir, "SKILL.md"), content);
}

function sourceAt(index: number): SkillSource {
  const source = TEST_SOURCES.at(index);
  if (!source) throw new Error(`no test source at index ${index}`);
  return source;
}

beforeAll(() => {
  mkdirSync(TMP_ROOT, { recursive: true });

  writeSkillMd(
    sourceAt(0),
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
    sourceAt(1),
    `---
name: ds-review
description: Review a PR for DS compliance
---
`,
  );

  writeSkillMd(
    sourceAt(3),
    `---
name: scaffold-story
description: Generate a Storybook story from anatomy
---
`,
  );

  // Invalid frontmatter (missing description) — should be skipped with warning
  writeSkillMd(
    sourceAt(4),
    `---
name: broken-skill
---
`,
  );

  // Source directory without a SKILL.md — should be skipped
  const noSkillMd = sourceAt(5);
  mkdirSync(noSkillMd.dir, { recursive: true });
  writeFileSync(join(noSkillMd.dir, "README.md"), "Not a skill");
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
    // TEST_SOURCES[2] (anatomy-dsl) was never created on disk
    const skills = await discoverSkills(TMP_ROOT, TEST_SOURCES);
    const packages = [...new Set(skills.map((s) => s.sourcePackage))];
    expect(packages).not.toContain("@canonical/anatomy-dsl");
  });

  it("skips source directories without SKILL.md", async () => {
    const skills = await discoverSkills(TMP_ROOT, TEST_SOURCES);
    const names = skills.map((s) => s.folderName);
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
    expect(audit?.sourcePath).toBe(sourceAt(0).dir);
  });

  it("preserves frontmatter metadata", async () => {
    const skills = await discoverSkills(TMP_ROOT, TEST_SOURCES);
    const audit = skills.find((s) => s.name === "design-audit");
    expect(audit?.frontmatter.metadata).toEqual({ author: "canonical" });
  });

  it("returns empty array when no sources available", async () => {
    const emptySources: SkillSource[] = [
      {
        dir: "/nonexistent/path/skills/some-skill",
        packageName: "@canonical/nope",
      },
    ];
    const skills = await discoverSkills("/nonexistent", emptySources);
    expect(skills).toEqual([]);
  });
});
