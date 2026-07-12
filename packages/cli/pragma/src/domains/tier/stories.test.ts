import type { URI } from "@canonical/ke";
import { describe, expect, it } from "vitest";
import { tierListStory } from "./stories.js";

const tier = {
  uri: "https://ds.example/global" as URI,
  path: "global",
  depth: 0,
};

describe("tierListStory", () => {
  it("renders the ink list view", () => {
    const view = tierListStory.renderInk?.([tier]);
    expect(typeof view).toBe("string");
    expect(view).toContain("Tiers");
  });

  it("rejects only empty results", () => {
    expect(tierListStory.emptyError?.([], {})).toBeDefined();
    expect(tierListStory.emptyError?.([tier], {})).toBeUndefined();
  });
});
