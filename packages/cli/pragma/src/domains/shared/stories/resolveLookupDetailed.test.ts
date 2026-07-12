import { describe, expect, it } from "vitest";
import resolveLookupDetailed from "./resolveLookupDetailed.js";
import type { LookupStory } from "./types.js";

type AnyLookupStory = LookupStory<unknown, unknown>;

const baseStory: Pick<
  AnyLookupStory,
  "noun" | "description" | "toolDescription" | "namesDescription"
> = {
  noun: "thing",
  description: "d",
  toolDescription: "td",
  namesDescription: "names",
};

function makeStory(overrides: Partial<AnyLookupStory>): AnyLookupStory {
  return {
    ...baseStory,
    examples: [],
    resolve: async () => ({ results: [], errors: [] }),
    toFmtInput: (entity) => entity,
    formatters: {
      plain: () => "",
      llm: () => "",
      json: () => "",
    },
    ...overrides,
  };
}

describe("resolveLookupDetailed", () => {
  it("is never detailed when the story has no detailed param", () => {
    const story = makeStory({});
    expect(resolveLookupDetailed(story, "cli", { detailed: true })).toBe(false);
    expect(resolveLookupDetailed(story, "mcp", {})).toBe(false);
  });

  it("defaults detailed to true on MCP and false on CLI", () => {
    const story = makeStory({ detailedParam: { description: "d" } });
    expect(resolveLookupDetailed(story, "mcp", {})).toBe(true);
    expect(resolveLookupDetailed(story, "mcp", { detailed: false })).toBe(
      false,
    );
    expect(resolveLookupDetailed(story, "cli", {})).toBe(false);
    expect(resolveLookupDetailed(story, "cli", { detailed: true })).toBe(true);
  });

  it("lets a story override the surface defaults", () => {
    const story = makeStory({
      detailedParam: { description: "d" },
      resolveDetailed: (surface) => surface === "cli",
    });
    expect(resolveLookupDetailed(story, "cli", {})).toBe(true);
    expect(resolveLookupDetailed(story, "mcp", {})).toBe(false);
  });
});
