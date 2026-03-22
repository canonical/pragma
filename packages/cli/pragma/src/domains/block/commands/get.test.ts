import type { CommandDefinition } from "@canonical/cli-core";
import type { Store } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PragmaError } from "#error";
import { createTestStore, DS_ALL_TTL } from "#testing";
import type { PragmaContext } from "../../shared/context.js";
import buildGetCommand from "./get.js";

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

describe("buildGetCommand", () => {
  it("returns summary by default", async () => {
    const ctx = makeCtx();
    const cmd = buildGetCommand(ctx);
    const { text } = await executeOutput(cmd, { name: "Button" }, ctx);
    expect(text).toContain("Button");
    expect(text).toContain("global");
  });

  it("returns detailed view with --detailed", async () => {
    const ctx = makeCtx();
    const cmd = buildGetCommand(ctx);
    const { text } = await executeOutput(
      cmd,
      { name: "Button", detailed: true },
      ctx,
    );
    expect(text).toContain("Button");
    expect(text).toContain("Modifiers");
    expect(text).toContain("importance");
  });

  it("shows only selected aspects (--modifiers)", async () => {
    const ctx = makeCtx();
    const cmd = buildGetCommand(ctx);
    const { text } = await executeOutput(
      cmd,
      { name: "Button", modifiers: true },
      ctx,
    );
    expect(text).toContain("Modifiers");
    expect(text).toContain("importance");
    // Summary field "Tokens: 1" is always shown, but token details should not appear
    expect(text).not.toContain("color.primary");
  });

  it("composes aspect flags (--modifiers --tokens)", async () => {
    const ctx = makeCtx();
    const cmd = buildGetCommand(ctx);
    const { text } = await executeOutput(
      cmd,
      { name: "Button", modifiers: true, tokens: true },
      ctx,
    );
    expect(text).toContain("Modifiers");
    expect(text).toContain("Tokens");
  });

  it("renders LLM markdown", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: true, format: "text" as const, verbose: false },
    });
    const cmd = buildGetCommand(ctx);
    const { text } = await executeOutput(cmd, { name: "Button" }, ctx);
    expect(text).toContain("## Button");
    expect(text).toContain("Tier: global");
  });

  it("renders JSON", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: false, format: "json" as const, verbose: false },
    });
    const cmd = buildGetCommand(ctx);
    const { text } = await executeOutput(cmd, { name: "Button" }, ctx);
    const parsed = JSON.parse(text);
    expect(parsed.name).toBe("Button");
    expect(parsed.tier).toBe("global");
  });

  it("renders JSON with detailed aspects", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: false, format: "json" as const, verbose: false },
    });
    const cmd = buildGetCommand(ctx);
    const { text } = await executeOutput(
      cmd,
      { name: "Button", detailed: true },
      ctx,
    );
    const parsed = JSON.parse(text);
    expect(parsed.modifierValues).toBeDefined();
    expect(parsed.tokens).toBeDefined();
  });

  it("populates nodeCount from anatomy nodes", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: false, format: "json" as const, verbose: false },
    });
    const cmd = buildGetCommand(ctx);
    const { text } = await executeOutput(cmd, { name: "Button" }, ctx);
    const parsed = JSON.parse(text);
    expect(parsed.nodeCount).toBe(3);
  });

  it("throws ENTITY_NOT_FOUND for unknown block", async () => {
    const ctx = makeCtx();
    const cmd = buildGetCommand(ctx);
    await expect(cmd.execute({ name: "NonExistent" }, ctx)).rejects.toThrow(
      PragmaError,
    );

    try {
      await cmd.execute({ name: "NonExistent" }, ctx);
    } catch (e) {
      expect(e).toBeInstanceOf(PragmaError);
      expect((e as PragmaError).code).toBe("ENTITY_NOT_FOUND");
      expect((e as PragmaError).recovery?.cli).toBe("pragma block list");
    }
  });

  it("throws INVALID_INPUT for empty name", async () => {
    const ctx = makeCtx();
    const cmd = buildGetCommand(ctx);
    await expect(cmd.execute({ name: "" }, ctx)).rejects.toThrow(PragmaError);

    try {
      await cmd.execute({ name: "" }, ctx);
    } catch (e) {
      expect(e).toBeInstanceOf(PragmaError);
      expect((e as PragmaError).code).toBe("INVALID_INPUT");
    }
  });

  it("provides tab completion candidates", async () => {
    const ctx = makeCtx();
    const cmd = buildGetCommand(ctx);
    const nameParam = cmd.parameters.find((p) => p.name === "name");
    expect(nameParam?.complete).toBeDefined();

    if (nameParam?.complete) {
      const candidates = await nameParam.complete("Bu", ctx);
      expect(candidates).toContain("Button");
    }
  });
});
