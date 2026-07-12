import { describe, expect, it } from "vitest";
import { ontologyListStory, ontologyShowStory } from "./stories.js";

describe("ontologyListStory", () => {
  it("renders the ink list view", () => {
    const view = ontologyListStory.renderInk?.([]);
    expect(typeof view).toBe("string");
    expect(view).toContain("Ontologies");
  });

  it("rejects only empty results", () => {
    expect(ontologyListStory.emptyError?.([], {})).toBeDefined();
    expect(
      ontologyListStory.emptyError?.(
        [
          {
            prefix: "ds",
            namespace: "https://ds.example/",
            classCount: 1,
            propertyCount: 1,
            anatomyCount: 0,
          },
        ],
        {},
      ),
    ).toBeUndefined();
  });
});

describe("ontologyShowStory", () => {
  it("guards against a missing prefix", () => {
    expect(ontologyShowStory.guardParams?.({})).toBeDefined();
    expect(ontologyShowStory.guardParams?.({ prefix: "" })).toBeDefined();
    expect(ontologyShowStory.guardParams?.({ prefix: "ds" })).toBeUndefined();
  });
});
