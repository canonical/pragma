import { describe, expect, it } from "vitest";
import clamp from "./clamp.js";

describe("Clamp util", () => {
  it("should handle undefined min", () => {
    expect(clamp(5, undefined, 10)).toBe(5);
    expect(clamp(15, undefined, 10)).toBe(10);
    expect(clamp(-5, undefined, -1)).toBe(-5);
  });

  it("should handle undefined max", () => {
    expect(clamp(5, 1, undefined)).toBe(5);
    expect(clamp(0, 1, undefined)).toBe(1);
    expect(clamp(-5, -10, undefined)).toBe(-5);
  });

  it("should handle both min and max undefined", () => {
    expect(clamp(5)).toBe(5);
    expect(clamp(-5)).toBe(-5);
  });

  it("should return the min if value is less than min", () => {
    expect(clamp(0, 1)).toBe(1);
    expect(clamp(-5, -3)).toBe(-3);
  });

  it("should return the max if value is greater than max", () => {
    expect(clamp(15, 5, 10)).toBe(10);
    expect(clamp(25, -3, 5)).toBe(5);
  });

  it("should return the value if it is within the range", () => {
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(-5, -10, -1)).toBe(-5);
    expect(clamp(0, -1, 1)).toBe(0);
  });
});
