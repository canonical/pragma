import { describe, expect, it } from "vitest";
import humanizeNumber from "./index.js";
import type { HumanizeResult } from "./types.js";

type TestCase = {
  it: string;
  input: number;
  options?: Parameters<typeof humanizeNumber>[1];
  expected: HumanizeResult;
};

describe("humanizeNumber", () => {
  describe("Basic Functionality", () => {
    const testCases: TestCase[] = [
      {
        it: "should format numbers less than the magnitude base without a unit",
        input: 999,
        expected: { displayValue: "999", value: 999, unit: "" },
      },
      {
        it: "should format a number exactly at the magnitude base",
        input: 1000,
        expected: { displayValue: "1k", value: 1000, unit: "k" },
      },
      {
        it: "should format thousands with one decimal place",
        input: 1500,
        expected: { displayValue: "1.5k", value: 1500, unit: "k" },
      },
      {
        it: "should format millions",
        input: 1.5e6,
        expected: { displayValue: "1.5M", value: 1.5e6, unit: "M" },
      },
      {
        it: "should format billions",
        input: 1.5e9,
        expected: { displayValue: "1.5B", value: 1.5e9, unit: "B" },
      },
      {
        it: "should format trillions",
        input: 1.5e12,
        expected: {
          displayValue: "1.5T",
          value: 1.5e12,
          unit: "T",
        },
      },
      {
        it: "should truncate input decimals and add a plus",
        input: 12345.67,
        expected: { displayValue: "12.3k+", value: 12345.67, unit: "k" },
      },
    ];

    testCases.forEach(({ it: testName, input, options, expected }) => {
      it(testName, () => {
        const result = humanizeNumber(input, options);
        expect(result).toEqual(expected);
      });
    });
  });

  describe("Custom Options", () => {
    it("should respect the `decimals` option for an exact value", () => {
      const input = 12345;
      const options = { decimals: 3 };
      const expected = { displayValue: "12.345k", value: input, unit: "k" };
      const result = humanizeNumber(input, options);
      expect(result).toEqual(expected);
    });

    it("should support custom `units`", () => {
      const input = 1.5e6;
      const options = { units: ["", "Kilo", "Mega"] };
      const expected = { displayValue: "1.5Mega", value: input, unit: "Mega" };
      const result = humanizeNumber(input, options);
      expect(result).toEqual(expected);
    });

    it("should support a custom `magnitudeBase`", () => {
      const input = 2048;
      const options = { magnitudeBase: 1024, units: ["B", "KiB", "MiB"] };
      const expected = { displayValue: "2KiB", value: input, unit: "KiB" };
      const result = humanizeNumber(input, options);
      expect(result).toEqual(expected);
    });
  });

  describe("Decimal Scenarios", () => {
    const testCases: TestCase[] = [
      {
        it: "should return the integer part for numbers just below a threshold",
        input: 999.99,
        expected: { displayValue: "999+", value: 999.99, unit: "" },
      },
      {
        it: "should add a plus when truncating a decimal down",
        input: 1299.99,
        expected: { displayValue: "1.2k+", value: 1299.99, unit: "k" },
      },
      {
        it: "should not add a plus for an exact decimal with sufficient precision",
        input: 1250,
        options: { decimals: 2 },
        expected: { displayValue: "1.25k", value: 1250, unit: "k" },
      },
      {
        it: "should add a plus if original decimal is higher than the precise formatted value",
        input: 1250.1,
        options: { decimals: 2 },
        expected: { displayValue: "1.25k+", value: 1250.1, unit: "k" },
      },
    ];

    testCases.forEach(({ it: testName, input, options, expected }) => {
      it(testName, () => {
        const result = humanizeNumber(input, options);
        expect(result).toEqual(expected);
      });
    });
  });

  describe("Edge Cases", () => {
    const testCases: TestCase[] = [
      {
        it: "should handle zero",
        input: 0,
        expected: { displayValue: "0", value: 0, unit: "" },
      },
      {
        it: "should return NaN displayValue for negative numbers",
        input: -100,
        expected: { displayValue: "NaN", value: -100, unit: "" },
      },
      {
        it: "should handle NaN input",
        input: NaN,
        expected: { displayValue: "NaN", value: NaN, unit: "" },
      },
      {
        it: "should handle Infinity input",
        input: Infinity,
        expected: { displayValue: "∞", value: Infinity, unit: "" },
      },
      {
        it: "should handle the largest unit boundary",
        input: 1e18,
        expected: { displayValue: "1000000T", value: 1e18, unit: "T" },
      },
    ];

    testCases.forEach(({ it: testName, input, options, expected }) => {
      it(testName, () => {
        const result = humanizeNumber(input, options);
        expect(result).toEqual(expected);
      });
    });
  });
});
