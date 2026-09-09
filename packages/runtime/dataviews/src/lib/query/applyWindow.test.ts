import { describe, expect, it } from "vitest";
import applyWindow from "./applyWindow.js";

const rows = ["a", "b", "c", "d", "e", "f", "g"];

describe("applyWindow", () => {
  it("projects the first page from the start", () => {
    expect(applyWindow(rows, { page: 1, size: 3 })).toEqual(["a", "b", "c"]);
  });

  it("projects interior pages with offsets", () => {
    expect(applyWindow(rows, { page: 2, size: 3 })).toEqual(["d", "e", "f"]);
    expect(applyWindow(rows, { page: 3, size: 3 })).toEqual(["g"]);
  });

  it("returns an empty window past the end", () => {
    expect(applyWindow(rows, { page: 4, size: 3 })).toEqual([]);
    expect(applyWindow(rows, { page: 9, size: 3 })).toEqual([]);
  });

  it("handles a window larger than the result set", () => {
    expect(applyWindow(rows, { page: 1, size: 50 })).toEqual(rows);
    expect(applyWindow(rows, { page: 2, size: 50 })).toEqual([]);
  });

  it("returns a fresh array, never the input", () => {
    const result = applyWindow(rows, { page: 1, size: 50 });
    expect(result).toEqual(rows);
    expect(result).not.toBe(rows);
  });

  it("never mutates the input rows", () => {
    const input = ["a", "b", "c"];
    applyWindow(input, { page: 1, size: 2 });
    expect(input).toEqual(["a", "b", "c"]);
  });

  it("rejects invalid windows like the addressed command layer", () => {
    for (const window of [
      { page: 0, size: 3 },
      { page: -1, size: 3 },
      { page: 1.5, size: 3 },
      { page: 1, size: 0 },
      { page: 1, size: -5 },
      { page: 1, size: 2.5 },
    ]) {
      expect(() => applyWindow(rows, window)).toThrow(
        /must be a positive integer/,
      );
    }
  });

  it("projects an empty result set to an empty window", () => {
    expect(applyWindow([], { page: 1, size: 10 })).toEqual([]);
  });
});
