import type { CommandDefinition } from "@canonical/cli-core";
import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestStore, DS_ALL_TTL } from "#testing";
import type { PragmaContext } from "../../shared/context.js";
import buildCategoriesCommand from "./categories.js";

let store: Store;
let cleanup: () => void;

beforeAll(async () => {
  const result = await createTestStore({ ttl: DS_ALL_TTL });
  store = result.store;
  cleanup = result.cleanup;
});

afterAll(() => cleanup());

function makeCtx(overrides: Partial<PragmaContext> = {}): PragmaContext {
  return {
    cwd: "/tmp",
    globalFlags: { llm: false, format: "text" as const, verbose: false },
    store,
    config: { tier: undefined, channel: "prerelease" },
    ...overrides,
  };
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

describe("buildCategoriesCommand", () => {
  it("returns categories with counts", async () => {
    const ctx = makeCtx();
    const cmd = buildCategoriesCommand(ctx);
    const { text } = await executeOutput(cmd, {}, ctx);
    expect(text).toContain("react (2 standards)");
    expect(text).toContain("code (1 standard)");
  });

  it("renders LLM format with --llm", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: true, format: "text" as const, verbose: false },
    });
    const cmd = buildCategoriesCommand(ctx);
    const { text } = await executeOutput(cmd, {}, ctx);
    expect(text).toContain("## Standard Categories");
    expect(text).toContain("**react**");
  });

  it("renders JSON output", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: false, format: "json" as const, verbose: false },
    });
    const cmd = buildCategoriesCommand(ctx);
    const { text } = await executeOutput(cmd, {}, ctx);
    const parsed = JSON.parse(text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.some((c: { name: string }) => c.name === "react")).toBe(true);
  });
});
