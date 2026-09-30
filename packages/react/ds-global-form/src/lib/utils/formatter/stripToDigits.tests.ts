import { describe, expect, it } from "vitest";
import applyPattern from "./applyPattern.js";
import stripToDigits from "./stripToDigits.js";

describe("stripToDigits", () => {
  it("strips separators back to raw digits", () => {
    expect(stripToDigits("(555) 123-4567")).toBe("5551234567");
  });

  it("is the inverse of applyPattern (round-trips the digits)", () => {
    const digits = "5551234567";
    expect(stripToDigits(applyPattern(digits, "(###) ###-####"))).toBe(digits);
  });

  it("returns an empty string for non-digit input", () => {
    expect(stripToDigits("()- ")).toBe("");
  });
});
