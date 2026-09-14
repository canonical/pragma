import { describe, expect, it } from "vitest";
import areFieldsEqual from "./areFieldsEqual.js";

describe("areFieldsEqual", () => {
  it("compares every field of the first record by identity", () => {
    const shared = { width: 1 };
    expect(areFieldsEqual({ a: shared, b: null }, { a: shared, b: null })).toBe(
      true,
    );
    expect(areFieldsEqual({ a: shared }, { a: { width: 1 } })).toBe(false);
    expect(areFieldsEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
  });
});
