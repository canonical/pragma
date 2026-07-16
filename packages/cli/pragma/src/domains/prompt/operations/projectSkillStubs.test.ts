import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PragmaConfig } from "#config";
import type { SkillSource } from "../../skill/helpers/index.js";
import projectSkillStubs from "./projectSkillStubs.js";

const CONFIG: PragmaConfig = { tier: undefined, channel: "normal" };

function makeRuntime(config: PragmaConfig = CONFIG) {
  return { cwd: process.cwd(), config, packages: [] };
}

describe("projectSkillStubs", () => {
  let dir: string;
  let sources: SkillSource[];

  function addSkill(folder: string, frontmatter: string): void {
    const skillDir = join(dir, folder);
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, "SKILL.md"),
      `---\n${frontmatter}\n---\n\nBody.\n`,
    );
    sources.push({ dir: skillDir, packageName: "@canonical/test-pkg" });
  }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pragma-stubs-"));
    sources = [];
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("projects a stub prompt per discovered skill", async () => {
    addSkill(
      "anatomy-author",
      "name: anatomy-author\ndescription: Author anatomy trees",
    );

    const stubs = await projectSkillStubs(makeRuntime(), new Set(), sources);

    expect(stubs).toHaveLength(1);
    const definition = stubs[0]?.definition;
    expect(definition?.name).toBe("anatomy-author");
    expect(definition?.description).toBe("Author anatomy trees");
    expect(definition?.template).toContain(
      'Load the skill "anatomy-author" (skill_lookup { name: "anatomy-author" } · pragma skill lookup anatomy-author) and follow its instructions.',
    );
    expect(definition?.arguments).toBeUndefined();
    expect(definition?.embed).toBeUndefined();
    expect(stubs[0]?.source).toBe("skill:@canonical/test-pkg/anatomy-author");
  });

  it("suppresses a stub when an authored prompt owns the name", async () => {
    addSkill("taken", "name: taken\ndescription: Shadowed by authored");

    const stubs = await projectSkillStubs(
      makeRuntime(),
      new Set(["taken"]),
      sources,
    );

    expect(stubs).toHaveLength(0);
  });

  it("respects SKILL.md frontmatter prompt: false", async () => {
    addSkill(
      "opted-out",
      "name: opted-out\ndescription: No stub\nprompt: false",
    );
    addSkill("opted-in", "name: opted-in\ndescription: Yes stub\nprompt: true");

    const stubs = await projectSkillStubs(makeRuntime(), new Set(), sources);

    expect(stubs.map((s) => s.definition.name)).toEqual(["opted-in"]);
  });

  it("turns all stubs off with prompts.skillStubs: false", async () => {
    addSkill("a-skill", "name: a-skill\ndescription: A");

    const stubs = await projectSkillStubs(
      makeRuntime({ ...CONFIG, prompts: { skillStubs: false } }),
      new Set(),
      sources,
    );

    expect(stubs).toHaveLength(0);
  });

  it("turns off only the named stubs with an array", async () => {
    addSkill("keep-me", "name: keep-me\ndescription: A");
    addSkill("drop-me", "name: drop-me\ndescription: B");

    const stubs = await projectSkillStubs(
      makeRuntime({ ...CONFIG, prompts: { skillStubs: ["drop-me"] } }),
      new Set(),
      sources,
    );

    expect(stubs.map((s) => s.definition.name)).toEqual(["keep-me"]);
  });

  it("first-wins on duplicate skill names", async () => {
    addSkill("dupe", "name: dupe\ndescription: First");
    addSkill("dupe-two", "name: dupe\ndescription: Second");

    const stubs = await projectSkillStubs(makeRuntime(), new Set(), sources);

    expect(stubs).toHaveLength(1);
    expect(stubs[0]?.definition.description).toBe("First");
  });
});
