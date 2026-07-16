import { describe, expect, it } from "vitest";
import { blockListStory } from "./stories.js";

describe("blockListStory", () => {
  it("renders the ink list view", () => {
    const view = blockListStory.renderInk?.([]);
    expect(typeof view).toBe("string");
    expect(view).toContain("Blocks");
  });
});
