import { describe, expect, it } from "vitest";
import { PragmaError } from "#error";
import type { PragmaContext } from "../context.js";
import compileReadCommand from "./compileReadCommand.js";
import type { ReadStory } from "./types.js";

interface FakeData {
  readonly items: readonly string[];
}

function makeStory(
  overrides: Partial<ReadStory<FakeData, readonly string[]>> = {},
): ReadStory<FakeData, readonly string[]> {
  return {
    noun: "thing",
    verb: "list",
    description: "List things",
    toolDescription: "List things over MCP.",
    params: [
      { name: "flag", type: "boolean", description: "a flag", default: false },
      { name: "hidden", type: "boolean", description: "mcp", surfaces: "mcp" },
    ],
    examples: ["pragma thing list"],
    resolve: async (_rt, params) => ({
      items: params.flag === true ? ["a", "b", "extra"] : ["a", "b"],
    }),
    toOutput: (data) => data.items,
    formatters: {
      plain: (items) => `plain:${items.join(",")}`,
      llm: (items) => `llm:${items.join(",")}`,
      json: (items) => JSON.stringify(items),
    },
    toEnvelope: (data) => ({ data: data.items }),
    ...overrides,
  };
}

function makeCtx(overrides: Partial<PragmaContext> = {}): PragmaContext {
  return {
    cwd: "/tmp",
    globalFlags: { llm: false, format: "text" as const, verbose: false },
    ...overrides,
  } as PragmaContext;
}

async function executeOutput(
  story: ReadStory<FakeData, readonly string[]>,
  params: Record<string, unknown>,
  ctx: PragmaContext,
): Promise<{ value: unknown; text: string }> {
  const cmd = compileReadCommand(ctx, story);
  const result = await cmd.execute(params, ctx);
  if (result.tag !== "output") throw new Error("expected output result");
  return { value: result.value, text: result.render.plain(result.value) };
}

describe("compileReadCommand", () => {
  it("projects path, description, examples, and CLI parameters", () => {
    const cmd = compileReadCommand(makeCtx(), makeStory());
    expect(cmd.path).toEqual(["thing", "list"]);
    expect(cmd.description).toBe("List things");
    expect(cmd.meta?.examples).toEqual(["pragma thing list"]);
    expect(cmd.parameters.map((p) => p.name)).toEqual(["flag"]);
  });

  it("resolves with parameters and renders the plain formatter", async () => {
    const { value, text } = await executeOutput(
      makeStory(),
      { flag: true },
      makeCtx(),
    );
    expect(value).toEqual(["a", "b", "extra"]);
    expect(text).toBe("plain:a,b,extra");
  });

  it("selects the llm formatter under --llm", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: true, format: "text", verbose: false },
    });
    const { text } = await executeOutput(makeStory(), {}, ctx);
    expect(text).toBe("llm:a,b");
  });

  it("throws the story's guardParams error before resolving", async () => {
    const story = makeStory({
      guardParams: (params) =>
        params.bad === true
          ? PragmaError.invalidInput("bad", "true")
          : undefined,
    });
    const cmd = compileReadCommand(makeCtx(), story);
    await expect(cmd.execute({ bad: true }, makeCtx())).rejects.toThrow(
      PragmaError,
    );
  });

  it("throws the story's emptyError after resolving", async () => {
    const story = makeStory({
      resolve: async () => ({ items: [] }),
      emptyError: (data) =>
        data.items.length === 0 ? PragmaError.emptyResults("thing") : undefined,
    });
    const cmd = compileReadCommand(makeCtx(), story);
    await expect(cmd.execute({}, makeCtx())).rejects.toThrow(
      "No things found.",
    );
  });

  it("exposes an ink renderer only when the story defines one", async () => {
    const withInk = makeStory({ renderInk: (items) => `ink:${items.length}` });
    const cmd = compileReadCommand(makeCtx(), withInk);
    const result = await cmd.execute({}, makeCtx());
    if (result.tag !== "output") throw new Error("expected output result");
    expect(result.render.ink?.(["a"])).toBe("ink:1");

    const plainOnly = compileReadCommand(makeCtx(), makeStory());
    const plainResult = await plainOnly.execute({}, makeCtx());
    if (plainResult.tag !== "output") throw new Error("expected output");
    expect(plainResult.render.ink).toBeUndefined();
  });
});
