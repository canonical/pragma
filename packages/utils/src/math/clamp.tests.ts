import { describe, expect, it } from "vitest";
import clamp from "./clamp.js";

type TestCase = {
  input: number;
  min?: number;
  max?: number;
  expected: number;
};

describe("Clamp util", () => {
  describe("undefined bounds handling", () => {
    it("should handle undefined min", () => {
      const testCases: TestCase[] = [
        { input: 5, max: 10, expected: 5 },
        { input: 15, max: 10, expected: 10 },
        { input: -5, max: -1, expected: -5 },
      ];

      testCases.forEach(({ input, min, max, expected }) => {
        expect(clamp(input, min, max)).toBe(expected);
      });
    });

    it("should handle undefined max", () => {
      const testCases: TestCase[] = [
        { input: 5, min: 1, expected: 5 },
        { input: 0, min: 1, expected: 1 },
        { input: -5, min: -10, expected: -5 },
      ];

      testCases.forEach(({ input, min, max, expected }) => {
        expect(clamp(input, min, max)).toBe(expected);
      });
    });

    it("should handle both min and max undefined", () => {
      const testCases: TestCase[] = [
        { input: 5, expected: 5 },
        { input: -5, expected: -5 },
        { input: 0, expected: 0 },
        { input: 42, expected: 42 },
        { input: -999, expected: -999 },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(clamp(input)).toBe(expected);
      });
    });
  });

  describe("boundary clamping", () => {
    it("should return the min if value is less than min", () => {
      const testCases: TestCase[] = [
        { input: 0, min: 1, expected: 1 },
        { input: -5, min: -3, expected: -3 },
        { input: 2, min: 5, expected: 5 },
      ];

      testCases.forEach(({ input, min, max, expected }) => {
        expect(clamp(input, min, max)).toBe(expected);
      });
    });

    it("should return the max if value is greater than max", () => {
      const testCases: TestCase[] = [
        { input: 15, min: 5, max: 10, expected: 10 },
        { input: 25, min: -3, max: 5, expected: 5 },
        { input: 100, min: 0, max: 50, expected: 50 },
        { input: 42, min: 0, max: 10, expected: 10 }, // From TSDoc example
      ];

      testCases.forEach(({ input, min, max, expected }) => {
        expect(clamp(input, min, max)).toBe(expected);
      });
    });

    it("should return the value if it is within the range", () => {
      const testCases: TestCase[] = [
        { input: 5, min: 1, max: 10, expected: 5 },
        { input: -5, min: -10, max: -1, expected: -5 },
        { input: 0, min: -1, max: 1, expected: 0 },
        { input: 7, min: 5, max: 10, expected: 7 },
      ];

      testCases.forEach(({ input, min, max, expected }) => {
        expect(clamp(input, min, max)).toBe(expected);
      });
    });
  });
});
