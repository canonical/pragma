import { describe, expect, it } from "vitest";
import join from "./join.js";

describe("join", () => {
  it("joins with default separator", () => {
    expect(join(["a", "b", "c"])).toBe("a, b, c");
  });

  it("joins with custom separator", () => {
    expect(join([1, 2, 3], " | ")).toBe("1 | 2 | 3");
  });

  it("converts elements to strings", () => {
    expect(join([1, true, null])).toBe("1, true, null");
  });

  it("returns empty string for empty array", () => {
    expect(join([])).toBe("");
  });
});
