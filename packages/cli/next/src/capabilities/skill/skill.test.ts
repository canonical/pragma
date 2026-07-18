/**
 * Skill discovery (list + lookup) — storeless filesystem reads.
 *
 * Skills are SKILL.md folders under the project root; discovery reads only the
 * filesystem, so the store must never boot (needsStore: false). The #856
 * `prompt` frontmatter flag is preserved.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { verbKey } from "../../kernel/packs/uniqueness.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import { TEST_FLAGS } from "../../testing/helpers/projectCli.js";
import type { DiscoveredSkill } from "./discover.js";
import { skillModule } from "./index.js";
import type { SkillLookup } from "./verbs.js";

const listVerb = skillModule.verbs.find(
  (v) => verbKey(v.path) === "skill list",
) as VerbSpec;
const lookupVerb = skillModule.verbs.find(
  (v) => verbKey(v.path) === "skill lookup",
) as VerbSpec;

let projectDir: string;
let rt: PragmaRuntime;

function writeSkill(name: string, body: string): void {
  const dir = join(projectDir, ".pragma", "skills", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), body);
}

beforeAll(() => {
  projectDir = mkdtempSync(join(tmpdir(), "pragma2-skills-"));
  writeSkill(
    "docx",
    "---\nname: docx\ndescription: Work with Word documents.\n---\nUse this for .docx files.",
  );
  writeSkill(
    "pdf",
    "---\nname: pdf\ndescription: Work with PDF files.\nprompt: true\nlicense: MIT\n---\nUse this for PDFs.",
  );
  // A folder with no SKILL.md is skipped gracefully.
  mkdirSync(join(projectDir, ".pragma", "skills", "empty"), {
    recursive: true,
  });
  rt = bootRuntime(TEST_FLAGS, projectDir);
});

afterAll(() => {
  rmSync(projectDir, { recursive: true, force: true });
});

describe("skill list (storeless)", () => {
  it("discovers skills by name, carrying the prompt flag", async () => {
    const skills = (await listVerb.run({}, rt)) as DiscoveredSkill[];
    expect(skills.map((s) => s.name)).toEqual(["docx", "pdf"]);
    expect(skills.find((s) => s.name === "pdf")?.frontmatter.prompt).toBe(true);
    expect(
      skills.find((s) => s.name === "docx")?.frontmatter.prompt,
    ).toBeUndefined();
    // needsStore: false — discovery never boots the store.
    expect(rt.store.booted).toBe(false);
  });
});

describe("skill lookup (storeless)", () => {
  it("returns metadata + instructions, and suggests on a miss", async () => {
    const skill = (await lookupVerb.run({ name: "pdf" }, rt)) as SkillLookup;
    expect(skill.description).toBe("Work with PDF files.");
    expect(skill.frontmatter.license).toBe("MIT");
    expect(skill.instructions).toBe("Use this for PDFs.");
    expect(rt.store.booted).toBe(false);

    await expect(lookupVerb.run({ name: "docs" }, rt)).rejects.toThrow(
      /not found/i,
    );
  });
});
