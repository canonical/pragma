import { describe, expect, it } from "vitest";
import type { PragmaRuntime } from "../types/index.js";
import compileReadTool from "./compileReadTool.js";
import type { ReadStory } from "./types.js";

interface FakeData {
  readonly items: readonly string[];
}

const story: ReadStory<FakeData, readonly string[]> = {
  noun: "thing",
  verb: "show",
  description: "Show things",
  toolDescription: "Show things over MCP.",
  params: [
    { name: "flag", type: "boolean", description: "a flag" },
    { name: "cliOnly", type: "boolean", description: "cli", surfaces: "cli" },
  ],
  examples: [],
  resolve: async (_rt, params) => ({
    items: params.flag === true ? ["a", "b", "extra"] : ["a", "b"],
  }),
  toOutput: (data) => data.items,
  formatters: {
    plain: (items) => `plain:${items.join(",")}`,
    llm: (items) => `llm:${items.join(",")}`,
    json: (items) => JSON.stringify(items),
  },
  toEnvelope: (data) => ({
    data: data.items,
    meta: { count: data.items.length },
  }),
};

const rt = {} as PragmaRuntime;

describe("compileReadTool", () => {
  it("derives the tool name and projects MCP params plus condensed", () => {
    const tool = compileReadTool(story);
    expect(tool.name).toBe("thing_show");
    expect(tool.description).toBe("Show things over MCP.");
    expect(tool.readOnly).toBe(true);
    expect(Object.keys(tool.params ?? {})).toEqual(["flag", "condensed"]);
  });

  it("returns the story envelope for plain calls", async () => {
    const tool = compileReadTool(story);
    const result = await tool.execute(rt, { flag: true });
    expect(result).toEqual({
      data: ["a", "b", "extra"],
      meta: { count: 3 },
    });
  });

  it("renders condensed output through the llm formatter", async () => {
    const tool = compileReadTool(story);
    const result = await tool.execute(rt, { condensed: true });
    expect(result).toEqual({
      condensed: true,
      text: "llm:a,b",
      tokens: `~${Math.ceil("llm:a,b".length / 4)}`,
    });
  });
});
