import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PragmaError } from "#error";
import { RECIPE_STORY } from "#testing";
import type { SemanticPackage } from "../../semanticPackage.js";
import collectPackStories from "./collectPackStories.js";

function makePackage(stories: SemanticPackage["stories"]): SemanticPackage {
  return {
    name: "@canonical/example",
    version: "1.0.0",
    source: "local",
    graphs: [],
    skills: [],
    stories,
  };
}

const CONFIG = { tier: undefined, channel: "normal" as const };

describe("collectPackStories", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it("collects config stories and validated package stories", () => {
    const entries = collectPackStories(
      { ...CONFIG, stories: [RECIPE_STORY] },
      [
        makePackage([
          {
            path: "/pkg/stories/other.json",
            definition: { ...RECIPE_STORY, noun: "other" },
          },
        ]),
      ],
      new Set(["block"]),
    );
    expect(entries.map((entry) => entry.definition.noun)).toEqual([
      "recipe",
      "other",
    ]);
    expect(entries.at(0)?.source).toBe("config");
    expect(entries.at(1)?.source).toBe("/pkg/stories/other.json");
  });

  it("lets config stories win noun collisions against packages", () => {
    const entries = collectPackStories(
      { ...CONFIG, stories: [RECIPE_STORY] },
      [
        makePackage([
          { path: "/pkg/stories/recipe.json", definition: RECIPE_STORY },
        ]),
      ],
      new Set(),
    );
    expect(entries).toHaveLength(1);
    expect(entries.at(0)?.source).toBe("config");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("already taken"));
  });

  it("skips invalid package stories with a warning", () => {
    const entries = collectPackStories(
      CONFIG,
      [
        makePackage([
          { path: "/pkg/stories/broken.json", definition: { nope: true } },
        ]),
      ],
      new Set(),
    );
    expect(entries).toHaveLength(0);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("skipping story"),
    );
  });

  it("throws when a config story shadows a built-in noun", () => {
    expect(() =>
      collectPackStories(
        { ...CONFIG, stories: [{ ...RECIPE_STORY, noun: "block" }] },
        [],
        new Set(["block"]),
      ),
    ).toThrow(PragmaError);
  });

  it("skips package stories that shadow built-in nouns", () => {
    const entries = collectPackStories(
      CONFIG,
      [
        makePackage([
          {
            path: "/pkg/stories/block.json",
            definition: { ...RECIPE_STORY, noun: "block" },
          },
        ]),
      ],
      new Set(["block"]),
    );
    expect(entries).toHaveLength(0);
  });
});
