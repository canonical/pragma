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

describe("skill precedence (project overrides installed)", () => {
  let precedenceDir: string;
  let installedHome: string;
  let savedDataHome: string | undefined;
  let precedenceRt: PragmaRuntime;

  beforeAll(() => {
    precedenceDir = mkdtempSync(join(tmpdir(), "pragma2-skills-proj-"));
    installedHome = mkdtempSync(join(tmpdir(), "pragma2-skills-installed-"));
    // An installed skill and a project skill both claim the name `shared`.
    const installed = join(installedHome, "pragma", "skills", "shared");
    mkdirSync(installed, { recursive: true });
    writeFileSync(
      join(installed, "SKILL.md"),
      "---\nname: shared\ndescription: INSTALLED copy.\n---\nInstalled body.",
    );
    const project = join(precedenceDir, ".pragma", "skills", "shared");
    mkdirSync(project, { recursive: true });
    writeFileSync(
      join(project, "SKILL.md"),
      "---\nname: shared\ndescription: PROJECT copy.\n---\nProject body.",
    );
    savedDataHome = process.env.XDG_DATA_HOME;
    process.env.XDG_DATA_HOME = installedHome;
    precedenceRt = bootRuntime(TEST_FLAGS, precedenceDir);
  });

  afterAll(() => {
    if (savedDataHome === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = savedDataHome;
    rmSync(precedenceDir, { recursive: true, force: true });
    rmSync(installedHome, { recursive: true, force: true });
  });

  it("returns the project skill, not the installed one, on a name clash", async () => {
    const skills = (await listVerb.run({}, precedenceRt)) as DiscoveredSkill[];
    const shared = skills.filter((s) => s.name === "shared");
    expect(shared).toHaveLength(1);
    expect(shared[0]?.description).toBe("PROJECT copy.");
  });
});
