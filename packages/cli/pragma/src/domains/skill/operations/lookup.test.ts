import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PragmaError } from "#error";
import type { SkillSource } from "../helpers/index.js";
import lookupSkill from "./lookup.js";

const TMP_ROOT = join(tmpdir(), `pragma-skill-lookup-${Date.now()}`);

/** Each source is one skill directory, matching the loader granularity. */
const TEST_SOURCES: SkillSource[] = [
  {
    dir: join(
      TMP_ROOT,
      "node_modules/@canonical/design-system/skills/design-auditor",
    ),
    packageName: "@canonical/design-system",
  },
  {
    dir: join(
      TMP_ROOT,
      "node_modules/@canonical/code-standards/skills/add-standard",
    ),
    packageName: "@canonical/code-standards",
  },
];

const AUDITOR_CONTENT = `---
name: design-auditor
description: Audit design system coverage
---

# Design Auditor

Full instructions here.
`;

beforeAll(() => {
  const auditor = TEST_SOURCES.at(0)?.dir ?? "";
  mkdirSync(auditor, { recursive: true });
  writeFileSync(join(auditor, "SKILL.md"), AUDITOR_CONTENT);
  writeFileSync(join(auditor, "AUDIT_SPEC.md"), "# Spec");

  const addStandard = TEST_SOURCES.at(1)?.dir ?? "";
  mkdirSync(addStandard, { recursive: true });
  writeFileSync(
    join(addStandard, "SKILL.md"),
    `---
name: add-standard
description: Create a new code standard
---
`,
  );
});

afterAll(() => {
  rmSync(TMP_ROOT, { recursive: true, force: true });
});

describe("lookupSkill", () => {
  it("returns the skill with full content and companion files", async () => {
    const skill = await lookupSkill(TMP_ROOT, "design-auditor", TEST_SOURCES);
    expect(skill.name).toBe("design-auditor");
    expect(skill.content).toBe(AUDITOR_CONTENT);
    expect(skill.files).toEqual(["AUDIT_SPEC.md"]);
    expect(skill.sourcePackage).toBe("@canonical/design-system");
  });

  it("matches case-insensitively", async () => {
    const skill = await lookupSkill(TMP_ROOT, "Design-Auditor", TEST_SOURCES);
    expect(skill.name).toBe("design-auditor");
  });

  it("reports no companion files when SKILL.md is alone", async () => {
    const skill = await lookupSkill(TMP_ROOT, "add-standard", TEST_SOURCES);
    expect(skill.files).toEqual([]);
  });

  it("throws not-found with suggestions for unknown names", async () => {
    await expect(
      lookupSkill(TMP_ROOT, "design-audit", TEST_SOURCES),
    ).rejects.toMatchObject({
      code: "ENTITY_NOT_FOUND",
      suggestions: ["design-auditor"],
    });
    await expect(
      lookupSkill(TMP_ROOT, "nope", TEST_SOURCES),
    ).rejects.toBeInstanceOf(PragmaError);
  });
});
