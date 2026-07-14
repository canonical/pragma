import { describe, expect, it } from "vitest";
import { PragmaError } from "#error";
import type { PragmaContext } from "../context.js";
import type { LookupResult } from "../contracts.js";
import compileLookupCommand from "./compileLookupCommand.js";
import type { LookupStory } from "./types.js";

interface FakeEntity {
  readonly name: string;
  readonly detail: string;
}

function makeStory(
  overrides: Partial<LookupStory<FakeEntity, string>> = {},
): LookupStory<FakeEntity, string> {
  return {
    noun: "thing",
    description: "Look up things",
    toolDescription: "Look up things over MCP.",
    namesDescription: "Thing names",
    detailedParam: { description: "Show details" },
    examples: ["pragma thing lookup a"],
    resolve: async (_rt, names) => {
      const results = names
        .filter((name) => name !== "missing")
        .map((name) => ({ name, detail: `detail-${name}` }));
      const errors: LookupResult<FakeEntity>["errors"] = names
        .filter((name) => name === "missing")
        .map((name) => ({
          query: name,
          code: "ENTITY_NOT_FOUND",
          message: `thing "${name}" not found.`,
        }));
      return { results, errors };
    },
    toFmtInput: (entity, view) =>
      view.detailed ? `${entity.name}:${entity.detail}` : entity.name,
    formatters: {
      plain: (text) => `plain:${text}`,
      llm: (text) => `llm:${text}`,
      json: (text) => JSON.stringify(text),
    },
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

async function executeText(
  story: LookupStory<FakeEntity, string>,
  params: Record<string, unknown>,
  ctx: PragmaContext,
): Promise<string> {
  const cmd = compileLookupCommand(ctx, story);
  const result = await cmd.execute(params, ctx);
  if (result.tag !== "output") throw new Error("expected output result");
  return result.render.plain(result.value);
}

describe("compileLookupCommand", () => {
  it("projects names, detailed, and extra parameters", () => {
    const story = makeStory({
      params: [
        { name: "extra", type: "boolean", description: "extra flag" },
        { name: "mcpOnly", type: "boolean", description: "x", surfaces: "mcp" },
      ],
      parameterGroups: { Extras: ["extra"] },
    });
    const cmd = compileLookupCommand(makeCtx(), story);
    expect(cmd.path).toEqual(["thing", "lookup"]);
    expect(cmd.parameters.map((p) => p.name)).toEqual([
      "names",
      "detailed",
      "extra",
    ]);
    const names = cmd.parameters.at(0);
    expect(names?.type).toBe("multiselect");
    expect(names?.positional).toBe(true);
    expect(names?.required).toBe(true);
    expect(cmd.parameterGroups).toEqual({ Extras: ["extra"] });
  });

  it("omits the detailed parameter when the story has none", () => {
    const cmd = compileLookupCommand(
      makeCtx(),
      makeStory({ detailedParam: undefined }),
    );
    expect(cmd.parameters.map((p) => p.name)).toEqual(["names"]);
  });

  it("renders each result and appends an errors section", async () => {
    const text = await executeText(
      makeStory(),
      { names: ["a", "missing"] },
      makeCtx(),
    );
    expect(text).toContain("plain:a");
    expect(text).toContain("Errors:");
    expect(text).toContain('thing "missing" not found.');
  });

  it("is summary by default and detailed with the flag", async () => {
    const summary = await executeText(makeStory(), { names: ["a"] }, makeCtx());
    expect(summary).toBe("plain:a");

    const detailed = await executeText(
      makeStory(),
      { names: ["a"], detailed: true },
      makeCtx(),
    );
    expect(detailed).toBe("plain:a:detail-a");
  });

  it("accepts the legacy single name parameter", async () => {
    const text = await executeText(makeStory(), { name: "a" }, makeCtx());
    expect(text).toBe("plain:a");
  });

  it("throws the story's empty-names error when no names are given", async () => {
    const story = makeStory({
      emptyNamesError: () => PragmaError.invalidInput("names", "(empty)"),
    });
    const cmd = compileLookupCommand(makeCtx(), story);
    await expect(cmd.execute({ names: [] }, makeCtx())).rejects.toThrow(
      PragmaError,
    );
  });

  it("exposes an ink renderer only when the story defines one", async () => {
    const story = makeStory({
      renderInk: (result, view) =>
        `ink:${result.results.length}:${view.detailed}`,
    });
    const cmd = compileLookupCommand(makeCtx(), story);
    const result = await cmd.execute({ names: ["a"] }, makeCtx());
    if (result.tag !== "output") throw new Error("expected output result");
    expect(result.render.ink?.(result.value)).toBe("ink:1:false");
  });
});
