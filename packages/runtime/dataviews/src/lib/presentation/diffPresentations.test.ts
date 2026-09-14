import { describe, expect, it } from "vitest";
import diffPresentations from "./diffPresentations.js";

describe("diffPresentations", () => {
  it("names every key whose value moved, with undefined for one that is gone", () => {
    expect(
      diffPresentations(
        { width: 100, order: ["a"], gone: true },
        { width: 150, order: ["a"], added: 1 },
      ),
    ).toEqual({ width: 150, gone: undefined, added: 1 });
    expect(diffPresentations({ width: 1 }, { width: 1 })).toEqual({});
  });
});
