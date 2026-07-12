import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CommandDefinition } from "@canonical/cli-core";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PragmaError } from "#error";
import type { PragmaContext } from "../../shared/context.js";
import buildLookupCommand from "./lookup.js";

const TMP_ROOT = join(tmpdir(), `pragma-skill-lookup-cmd-${Date.now()}`);

/** One source per skill directory, matching the loader granularity. */
const TEST_SOURCES = [
  {
    dir: join(
      TMP_ROOT,
      "node_modules/@canonical/design-system/skills/design-auditor",
    ),
    packageName: "@canonical/design-system",
  },
];

vi.mock("../helpers/resolveSkillSources.js", () => ({
  default: () => TEST_SOURCES,
}));

beforeAll(() => {
  const dir = TEST_SOURCES.at(0)?.dir ?? "";
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "SKILL.md"),
    `---
name: design-auditor
description: Audit design system coverage
---

# Design Auditor
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

async function executeText(
  cmd: CommandDefinition,
  params: Record<string, unknown>,
  ctx: PragmaContext,
): Promise<string> {
  const result = await cmd.execute(params, ctx);
  expect(result.tag).toBe("output");
  if (result.tag !== "output") throw new Error("Expected output result");
  return result.render.plain(result.value);
}

describe("buildLookupCommand", () => {
  it("serves the full SKILL.md content", async () => {
    const ctx = makeCtx();
    const text = await executeText(
      buildLookupCommand(ctx),
      { names: ["design-auditor"] },
      ctx,
    );
    expect(text).toContain("design-auditor");
    expect(text).toContain("# Design Auditor");
  });

  it("renders JSON with content under --format json", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: false, format: "json", verbose: false },
    });
    const text = await executeText(
      buildLookupCommand(ctx),
      { names: ["design-auditor"] },
      ctx,
    );
    const data = JSON.parse(text) as { name: string; content: string };
    expect(data.name).toBe("design-auditor");
    expect(data.content).toContain("# Design Auditor");
  });

  it("reports unknown skills in the errors section", async () => {
    const ctx = makeCtx();
    const text = await executeText(
      buildLookupCommand(ctx),
      { names: ["nope"] },
      ctx,
    );
    expect(text).toContain("Errors:");
    expect(text).toContain('skill "nope" not found.');
  });

  it("rejects an empty names list with a recovery hint", async () => {
    const ctx = makeCtx();
    const cmd = buildLookupCommand(ctx);
    await expect(cmd.execute({ names: [] }, ctx)).rejects.toThrow(PragmaError);
  });

  it("completes skill names from discovery", async () => {
    const ctx = makeCtx();
    const cmd = buildLookupCommand(ctx);
    const names = cmd.parameters.at(0);
    await expect(names?.complete?.("des", ctx)).resolves.toEqual([
      "design-auditor",
    ]);
  });
});
