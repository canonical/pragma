import { describe, expect, it } from "vitest";
import { modifierListStory, modifierLookupStory } from "./stories.js";

describe("modifierListStory", () => {
  it("renders the ink list view", () => {
    const view = modifierListStory.renderInk?.([]);
    expect(typeof view).toBe("string");
    expect(view).toContain("Modifiers");
  });
});

describe("modifierLookupStory", () => {
  it("renders the ink lookup view", () => {
    const view = modifierLookupStory.renderInk?.(
      { results: [], errors: [] },
      { surface: "cli", detailed: false, params: {} },
    );
    expect(typeof view).toBe("string");
  });
});
