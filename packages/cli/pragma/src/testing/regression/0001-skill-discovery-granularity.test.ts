/**
 * Regression: skill discovery returned zero skills on real installs.
 *
 * `readPackageDir` emits one `SkillEntry.dir` per skill folder
 * (`<package>/skills/<name>`), but `discoverSkills` treated each source
 * directory as a *parent* of skill folders and scanned it for
 * subdirectories containing SKILL.md. Production sources therefore never
 * matched — `pragma skill list` errored with "No SKILL.md files found"
 * and MCP `skill_list` returned an empty list, despite `doctor` counting
 * skills in the very same packages. This test pins the granularity
 * contract between the loader and discovery using both real
 * implementations end-to-end.
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import readPackageDir from "../../domains/shared/loaders/readPackageDir.js";
import type { SemanticPackage } from "../../domains/shared/semanticPackage.js";
import { resolveSkillSources } from "../../domains/skill/helpers/index.js";
import discoverSkills from "../../domains/skill/operations/discover.js";

const TMP_ROOT = join(tmpdir(), `pragma-regression-0001-${Date.now()}`);
const PKG_DIR = join(TMP_ROOT, "node_modules/@canonical/design-system");

beforeAll(() => {
  const skillDir = join(PKG_DIR, "skills/design-auditor");
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(
    join(PKG_DIR, "package.json"),
    JSON.stringify({ name: "@canonical/design-system", version: "0.1.2" }),
  );
  writeFileSync(
    join(skillDir, "SKILL.md"),
    `---
name: design-auditor
description: Audit design system coverage, consistency, and quality
---

# Design Auditor
`,
  );
});

afterAll(() => {
  rmSync(TMP_ROOT, { recursive: true, force: true });
});

describe("skill discovery granularity (loader -> discovery contract)", () => {
  it("discovers skills from sources produced by readPackageDir", async () => {
    const contents = readPackageDir(PKG_DIR);
    expect(contents.skills).toHaveLength(1);

    const pkg: SemanticPackage = {
      name: "@canonical/design-system",
      version: contents.version,
      source: "local",
      graphs: contents.graphs,
      skills: contents.skills,
    };

    const sources = resolveSkillSources([pkg]);
    const skills = await discoverSkills(TMP_ROOT, sources);

    expect(skills).toHaveLength(1);
    expect(skills.at(0)?.name).toBe("design-auditor");
    expect(skills.at(0)?.folderName).toBe("design-auditor");
    expect(skills.at(0)?.sourcePackage).toBe("@canonical/design-system");
  });
});
