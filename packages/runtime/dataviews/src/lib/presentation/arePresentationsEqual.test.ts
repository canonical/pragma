import { describe, expect, it } from "vitest";
import arePresentationsEqual from "./arePresentationsEqual.js";

describe("arePresentationsEqual", () => {
  it("compares key by key as JSON", () => {
    expect(arePresentationsEqual({}, {})).toBe(true);
    expect(
      arePresentationsEqual(
        { width: 1, order: ["a", "b"] },
        { order: ["a", "b"], width: 1 },
      ),
    ).toBe(true);
    expect(arePresentationsEqual({ width: 1 }, { width: 2 })).toBe(false);
    expect(arePresentationsEqual({ width: 1 }, { width: 1, depth: 1 })).toBe(
      false,
    );
    expect(arePresentationsEqual({ width: 1 }, { depth: 1 })).toBe(false);
  });
});
