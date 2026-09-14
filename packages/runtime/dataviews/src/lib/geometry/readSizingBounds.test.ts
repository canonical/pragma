import { describe, expect, it } from "vitest";
import readSizingBounds from "./readSizingBounds.js";

describe("readSizingBounds", () => {
  it("holds a flexible column to its minimum and maximum", () => {
    expect(
      readSizingBounds({ kind: "flex", weight: 1, minPx: 80, maxPx: 300 }),
    ).toEqual({ min: 80, max: 300 });
    expect(readSizingBounds({ kind: "flex", weight: 1, minPx: 80 })).toEqual({
      min: 80,
      max: Number.POSITIVE_INFINITY,
    });
  });

  it("lets a fixed column go anywhere from zero", () => {
    expect(readSizingBounds({ kind: "fixed", px: 120 })).toEqual({
      min: 0,
      max: Number.POSITIVE_INFINITY,
    });
  });
});
