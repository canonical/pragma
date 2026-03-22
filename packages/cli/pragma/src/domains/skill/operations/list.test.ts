import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SkillSource } from "../helpers/index.js";
import listSkills from "./list.js";

const TMP_ROOT = join(tmpdir(), `pragma-skill-list-${Date.now()}`);

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

beforeAll(() => {
  mkdirSync(TMP_ROOT, { recursive: true });

  const skillDir = join(TEST_SOURCES[0].dir, "design-audit");
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(
    join(skillDir, "SKILL.md"),
    `---
name: design-audit
description: Audit a component against DS specs
---
`,
  );
});

afterAll(() => {
  rmSync(TMP_ROOT, { recursive: true, force: true });
});

describe("listSkills", () => {
  it("returns discovered skills", async () => {
    const { skills } = await listSkills(TMP_ROOT, TEST_SOURCES);
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe("design-audit");
  });

  it("reports source availability", async () => {
    const { sources } = await listSkills(TMP_ROOT, TEST_SOURCES);
    const ds = sources.find(
      (s) => s.packageName === "@canonical/design-system",
    );
    expect(ds?.available).toBe(true);

    const anatomyDsl = sources.find(
      (s) => s.packageName === "@canonical/anatomy-dsl",
    );
    expect(anatomyDsl?.available).toBe(false);
  });

  it("includes all three sources in result", async () => {
    const { sources } = await listSkills(TMP_ROOT, TEST_SOURCES);
    expect(sources).toHaveLength(3);
  });
});
