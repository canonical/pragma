import { describe, expect, it } from "vitest";
import type { LookupResult } from "../contracts.js";
import type { PragmaRuntime } from "../types/index.js";
import compileLookupTool from "./compileLookupTool.js";
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
    namesToolDescription: "Thing names to look up",
    detailedParam: { description: "Show details" },
    examples: [],
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
      return { results, errors, meta: { internalErrorCount: 0 } };
    },
    toFmtInput: (entity, view) =>
      view.detailed ? `${entity.name}:${entity.detail}` : entity.name,
    formatters: {
      plain: (text) => `plain:${text}`,
      llm: (text) => `llm:${text}`,
      json: (text) => JSON.stringify(text),
    },
    project: (entity) => ({ name: entity.name }),
    ...overrides,
  };
}

const rt = {} as PragmaRuntime;

describe("compileLookupTool", () => {
  it("derives the tool name and params", () => {
    const tool = compileLookupTool(makeStory());
    expect(tool.name).toBe("thing_lookup");
    expect(tool.readOnly).toBe(true);
    expect(Object.keys(tool.params ?? {})).toEqual([
      "names",
      "detailed",
      "condensed",
    ]);
    expect(tool.params?.names).toEqual({
      type: "string[]",
      description: "Thing names to look up",
      optional: false,
    });
  });

  it("returns full results by default (MCP detailed defaults to true)", async () => {
    const tool = compileLookupTool(makeStory());
    const result = await tool.execute(rt, { names: ["a"] });
    expect(result).toEqual({
      data: {
        results: [{ name: "a", detail: "detail-a" }],
        errors: [],
      },
      meta: { count: 1 },
    });
  });

  it("applies the summary projection when detailed is false", async () => {
    const tool = compileLookupTool(makeStory());
    const result = await tool.execute(rt, {
      names: ["a", "b"],
      detailed: false,
    });
    expect(result).toEqual({
      data: {
        results: [{ name: "a" }, { name: "b" }],
        errors: [],
      },
      meta: { count: 2 },
    });
  });

  it("renders condensed output per entity and appends an errors section", async () => {
    const tool = compileLookupTool(makeStory());
    const result = await tool.execute(rt, {
      names: ["a", "missing"],
      condensed: true,
    });
    if (!("condensed" in result)) throw new Error("expected condensed result");
    expect(result.text).toContain("llm:a:detail-a");
    expect(result.text).toContain("### Errors");
    expect(result.text).toContain('- missing: thing "missing" not found.');
  });
});
