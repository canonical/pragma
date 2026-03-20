import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SKILL_SOURCES } from "../constants.js";
import listSkills from "./list.js";

const TMP_ROOT = join(tmpdir(), `pragma-skill-list-${Date.now()}`);

beforeAll(() => {
  mkdirSync(TMP_ROOT, { recursive: true });

  const skillDir = join(TMP_ROOT, SKILL_SOURCES[0], "design-audit");
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
    const { skills } = await listSkills(TMP_ROOT);
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe("design-audit");
  });

  it("reports source availability", async () => {
    const { sources } = await listSkills(TMP_ROOT);
    const dsGlobal = sources.find(
      (s) => s.packageName === "@canonical/ds-global",
    );
    expect(dsGlobal?.available).toBe(true);

    const anatomyDsl = sources.find(
      (s) => s.packageName === "@canonical/anatomy-dsl",
    );
    expect(anatomyDsl?.available).toBe(false);
  });

  it("includes all three sources in result", async () => {
    const { sources } = await listSkills(TMP_ROOT);
    expect(sources).toHaveLength(3);
  });
});
