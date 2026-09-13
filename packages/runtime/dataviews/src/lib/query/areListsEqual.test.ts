import { describe, expect, it, vi } from "vitest";
import areListsEqual from "./areListsEqual.js";

describe("areListsEqual", () => {
  it("compares lists of one length element by element, in order", () => {
    const equals = vi.fn((a: number, b: number) => a === b);
    expect(areListsEqual([1, 2, 3], [1, 2, 3], equals)).toBe(true);
    expect(equals.mock.calls).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
    ]);
    expect(areListsEqual([1, 2, 3], [1, 2, 4], equals)).toBe(false);
  });

  it("reads no element of lists whose lengths differ", () => {
    const equals = vi.fn(() => true);
    expect(areListsEqual([1, 2], [1], equals)).toBe(false);
    expect(areListsEqual([], [1], equals)).toBe(false);
    expect(equals).not.toHaveBeenCalled();
  });

  it("stops at the first element the comparison rejects", () => {
    const equals = vi.fn((a: string, b: string) => a === b);
    expect(areListsEqual(["a", "b", "c"], ["a", "x", "c"], equals)).toBe(false);
    expect(equals).toHaveBeenCalledTimes(2);
  });
});
