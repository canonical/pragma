import type { CommandDefinition } from "@canonical/cli-core";
import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PragmaError } from "#error";
import { createTestStore, DS_ALL_TTL } from "#testing";
import type { PragmaContext } from "../../shared/context.js";
import buildListCommand from "./list.js";

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

describe("buildListCommand", () => {
  it("returns output result with all standards", async () => {
    const ctx = makeCtx();
    const cmd = buildListCommand(ctx);
    const { text } = await executeOutput(cmd, {}, ctx);
    expect(text).toContain("react/component/folder-structure");
    expect(text).toContain("react/component/props");
    expect(text).toContain("code/function/purity");
  });

  it("filters by --category", async () => {
    const ctx = makeCtx();
    const cmd = buildListCommand(ctx);
    const { text } = await executeOutput(cmd, { category: "react" }, ctx);
    expect(text).toContain("react/component/folder-structure");
    expect(text).toContain("react/component/props");
    expect(text).not.toContain("code/function/purity");
  });

  it("filters by --search", async () => {
    const ctx = makeCtx();
    const cmd = buildListCommand(ctx);
    const { text } = await executeOutput(cmd, { search: "folder" }, ctx);
    expect(text).toContain("react/component/folder-structure");
    expect(text).not.toContain("code/function/purity");
  });

  it("throws EMPTY_RESULTS for non-matching filter", async () => {
    const ctx = makeCtx();
    const cmd = buildListCommand(ctx);
    try {
      await cmd.execute({ category: "nonexistent" }, ctx);
      expect.fail("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(PragmaError);
      expect((e as PragmaError).code).toBe("EMPTY_RESULTS");
    }
  });

  it("renders LLM format with --llm", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: true, format: "text" as const, verbose: false },
    });
    const cmd = buildListCommand(ctx);
    const { text } = await executeOutput(cmd, {}, ctx);
    expect(text).toContain("## Standards");
    expect(text).toContain("**react/component/folder-structure**");
  });

  it("renders JSON output", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: false, format: "json" as const, verbose: false },
    });
    const cmd = buildListCommand(ctx);
    const { text } = await executeOutput(cmd, {}, ctx);
    const parsed = JSON.parse(text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(
      parsed.some(
        (s: { name: string }) => s.name === "react/component/folder-structure",
      ),
    ).toBe(true);
  });
});
