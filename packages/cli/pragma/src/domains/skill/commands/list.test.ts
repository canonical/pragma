import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CommandDefinition } from "@canonical/cli-core";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { PragmaContext } from "../../shared/context.js";
import type { SkillListInput } from "../formatters/types.js";
import buildListCommand from "./list.js";

const TMP_ROOT = join(tmpdir(), `pragma-skill-cmd-${Date.now()}`);

const TEST_SOURCES = [
  {
    dir: join(TMP_ROOT, "node_modules/@canonical/design-system/skills"),
    packageName: "@canonical/design-system",
  },
];

vi.mock("../helpers/resolveSkillSources.js", () => ({
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
metadata:
  author: canonical
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

async function executeOutput(
  cmd: CommandDefinition,
  params: Record<string, unknown>,
  ctx: PragmaContext,
): Promise<{ value: unknown; text: string }> {
  const result = await cmd.execute(params, ctx);
  expect(result.tag).toBe("output");
  if (result.tag !== "output") throw new Error("Expected output result");
  const text = result.render.plain(result.value);
  return { value: result.value, text };
}

describe("buildListCommand", () => {
  it("returns output result with skill data", async () => {
    const ctx = makeCtx();
    const cmd = buildListCommand(ctx);
    const { value } = await executeOutput(cmd, {}, ctx);
    const input = value as SkillListInput;
    expect(input.skills).toHaveLength(1);
    expect(input.skills[0].name).toBe("design-audit");
  });

  it("renders plain text output", async () => {
    const ctx = makeCtx();
    const cmd = buildListCommand(ctx);
    const { text } = await executeOutput(cmd, {}, ctx);
    expect(text).toContain("design-audit");
    expect(text).toContain("@canonical/design-system");
  });

  it("renders LLM markdown", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: true, format: "text" as const, verbose: false },
    });
    const cmd = buildListCommand(ctx);
    const { text } = await executeOutput(cmd, {}, ctx);
    expect(text).toContain("## Skills");
    expect(text).toContain("**design-audit**");
  });

  it("renders JSON output", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: false, format: "json" as const, verbose: false },
    });
    const cmd = buildListCommand(ctx);
    const { text } = await executeOutput(cmd, {}, ctx);
    const parsed = JSON.parse(text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].name).toBe("design-audit");
  });

  it("passes detailed flag to formatter input", async () => {
    const ctx = makeCtx();
    const cmd = buildListCommand(ctx);
    const { value } = await executeOutput(cmd, { detailed: true }, ctx);
    expect((value as SkillListInput).detailed).toBe(true);
  });
});
