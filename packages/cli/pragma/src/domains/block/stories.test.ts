import { describe, expect, it } from "vitest";
import { blockListStory, blockLookupStory } from "./stories.js";

describe("blockListStory", () => {
  it("renders the ink list view", () => {
    const view = blockListStory.renderInk?.([]);
    expect(typeof view).toBe("string");
    expect(view).toContain("Blocks");
  });
});

describe("blockLookupStory", () => {
  it("renders the ink lookup view", () => {
    const view = blockLookupStory.renderInk?.(
      { results: [], errors: [] },
      { surface: "cli", detailed: false, params: {} },
    );
    expect(typeof view).toBe("string");
  });

  it("implies detail from aspect flags on the CLI only", () => {
    const resolveDetailed = blockLookupStory.resolveDetailed;
    expect(resolveDetailed?.("cli", { anatomy: true })).toBe(true);
    expect(resolveDetailed?.("cli", {})).toBe(false);
    expect(resolveDetailed?.("mcp", {})).toBe(true);
    expect(resolveDetailed?.("mcp", { detailed: false })).toBe(false);
  });
});
