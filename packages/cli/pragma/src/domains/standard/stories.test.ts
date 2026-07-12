import { describe, expect, it } from "vitest";
import { standardListStory, standardLookupStory } from "./stories.js";

describe("standardListStory", () => {
  it("renders the ink list view", () => {
    const view = standardListStory.renderInk?.({
      items: [],
      details: undefined,
      disclosure: { level: "summary" },
    });
    expect(typeof view).toBe("string");
    expect(view).toContain("Standards");
  });
});

describe("standardLookupStory", () => {
  it("renders the ink lookup view", () => {
    const view = standardLookupStory.renderInk?.(
      { results: [], errors: [] },
      { surface: "cli", detailed: false, params: {} },
    );
    expect(typeof view).toBe("string");
  });
});
