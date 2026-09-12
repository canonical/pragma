import { describe, expect, it } from "vitest";
import applyWindow from "./applyWindow.js";
import DEFAULT_WINDOW from "./defaultWindow.js";
import type { ResultWindow } from "./types.js";

const rows = ["a", "b", "c", "d", "e", "f", "g"];

const at = (page: number, size: number): ResultWindow => ({
  ...DEFAULT_WINDOW,
  page,
  size,
});

describe("applyWindow", () => {
  it("projects the first page from the start", () => {
    expect(applyWindow(rows, at(1, 3))).toEqual(["a", "b", "c"]);
  });

  it("projects interior pages with offsets", () => {
    expect(applyWindow(rows, at(2, 3))).toEqual(["d", "e", "f"]);
    expect(applyWindow(rows, at(3, 3))).toEqual(["g"]);
  });

  it("returns an empty window past the end", () => {
    expect(applyWindow(rows, at(4, 3))).toEqual([]);
    expect(applyWindow(rows, at(9, 3))).toEqual([]);
  });

  it("handles a window larger than the result set", () => {
    expect(applyWindow(rows, at(1, 50))).toEqual(rows);
    expect(applyWindow(rows, at(2, 50))).toEqual([]);
  });

  it("returns a fresh array, never the input", () => {
    const result = applyWindow(rows, at(1, 50));
    expect(result).toEqual(rows);
    expect(result).not.toBe(rows);
  });

  it("never mutates the input rows", () => {
    const input = ["a", "b", "c"];
    applyWindow(input, at(1, 2));
    expect(input).toEqual(["a", "b", "c"]);
  });

  it("pages by number and size alone, whatever else the window carries", () => {
    // The cursor addresses a page start at the source; collapse is the
    // source's too. Neither moves a projection over rows already in hand.
    expect(
      applyWindow(rows, {
        page: 2,
        size: 3,
        cursor: "opaque",
        collapsed: [["failed"]],
      }),
    ).toEqual(["d", "e", "f"]);
  });

  it("rejects invalid windows like the addressed command layer", () => {
    for (const window of [
      at(0, 3),
      at(-1, 3),
      at(1.5, 3),
      at(1, 0),
      at(1, -5),
      at(1, 2.5),
    ]) {
      expect(() => applyWindow(rows, window)).toThrow(
        /must be a positive integer/,
      );
    }
  });

  it("projects an empty result set to an empty window", () => {
    expect(applyWindow([], at(1, 10))).toEqual([]);
  });
});
