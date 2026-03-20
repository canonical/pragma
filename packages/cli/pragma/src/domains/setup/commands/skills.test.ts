import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PragmaContext } from "../../shared/context.js";
import { SKILL_SOURCES } from "../../skill/constants.js";
import buildSkillsCommand from "./skills.js";

const TMP_ROOT = join(tmpdir(), `pragma-setup-cmd-${Date.now()}`);

beforeAll(() => {
  mkdirSync(TMP_ROOT, { recursive: true });

  const dir = join(TMP_ROOT, SKILL_SOURCES[0], "design-audit");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "SKILL.md"),
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

function makeCtx(overrides: Partial<PragmaContext> = {}): PragmaContext {
  return {
    cwd: TMP_ROOT,
    globalFlags: { llm: false, format: "text" as const, verbose: false },
    store: {} as PragmaContext["store"],
    config: { tier: undefined, channel: "normal" },
    ...overrides,
  } as PragmaContext;
}

describe("buildSkillsCommand", () => {
  it("has correct path and parameters", () => {
    const cmd = buildSkillsCommand();
    expect(cmd.path).toEqual(["setup", "skills"]);
    expect(cmd.parameters.map((p) => p.name)).toContain("dryRun");
    expect(cmd.parameters.map((p) => p.name)).toContain("yes");
  });

  it("throws PragmaError when no skills found", async () => {
    const cmd = buildSkillsCommand();
    const ctx = makeCtx({ cwd: "/nonexistent/path" });
    await expect(cmd.execute({}, ctx)).rejects.toThrow("No skills found");
  });

  it("returns output result for found skills", async () => {
    const cmd = buildSkillsCommand();
    const ctx = makeCtx();
    // This will detect no harnesses but still create .agents/skills
    const result = await cmd.execute({ dryRun: true }, ctx);
    // Dry run produces output
    expect(result.tag).toBe("output");
  });
});
