import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { PragmaContext } from "../../shared/context.js";
import buildSkillsCommand from "./skills.js";

const TMP_ROOT = join(tmpdir(), `pragma-setup-cmd-${Date.now()}`);

const TEST_SOURCES = [
  {
    dir: join(TMP_ROOT, "node_modules/@canonical/design-system/skills"),
    packageName: "@canonical/design-system",
    relativePath: "node_modules/@canonical/design-system/skills",
  },
];

vi.mock("../../skill/helpers/resolveSkillSources.js", () => ({
  default: () => TEST_SOURCES,
}));

beforeAll(() => {
  mkdirSync(TMP_ROOT, { recursive: true });

  const dir = join(TEST_SOURCES[0].dir, "design-audit");
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

  it("returns output result for found skills", async () => {
    const cmd = buildSkillsCommand();
    const ctx = makeCtx();
    // This will detect no harnesses but still create .agents/skills
    const result = await cmd.execute({ dryRun: true }, ctx);
    // Dry run produces output
    expect(result.tag).toBe("output");
  });
});
