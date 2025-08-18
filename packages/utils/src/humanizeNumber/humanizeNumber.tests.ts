import { describe, expect, it } from "vitest";
import humanizeNumber, { humanizeNumberToString } from "./index.js";
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

    it("should clamp the value before formatting when `clampOptions` are provided", () => {
      const testCases: TestCase[] = [
        {
          it: "should use the max value when input is too high",
          input: 9000,
          options: { clampOptions: { min: 0, max: 4001 } },
          expected: { displayValue: "4k+", value: 9000, unit: "k" },
        },
        {
          it: "should use the min value when input is too low",
          input: -500,
          options: { clampOptions: { min: 0, max: 4000 } },
          expected: { displayValue: "0", value: -500, unit: "" },
        },
      ];

      testCases.forEach(({ input, options, expected }) => {
        const result = humanizeNumber(input, options);
        expect(result).toEqual(expected);
      });
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

  describe("MaxChars Constraint", () => {
    const testCases: TestCase[] = [
      {
        it: "should respect maxChars by reducing decimal places while keeping unit",
        input: 123456,
        options: { maxChars: 5 },
        expected: { displayValue: "123k+", value: 123456, unit: "k" },
      },
      {
        it: "should handle very small maxChars",
        input: 9999,
        options: { maxChars: 2 },
        expected: { displayValue: "9+", value: 9999, unit: "" },
      },
      {
        it: "should use k unit when maxChars allows",
        input: 9999,
        options: { maxChars: 3 },
        expected: { displayValue: "9k+", value: 9999, unit: "k" },
      },
      {
        it: "should handle maxChars with decimals option",
        input: 1234567,
        options: { maxChars: 6, decimals: 2 },
        expected: { displayValue: "1.23M+", value: 1234567, unit: "M" },
      },
      {
        it: "should constrain large numbers to maxChars without unit",
        input: 999_999_999,
        options: { maxChars: 4 },
        expected: { displayValue: "99M+", value: 999_999_999, unit: "M" },
      },
      {
        it: "should handle numbers that don't need units with maxChars",
        input: 999,
        options: { maxChars: 3 },
        expected: { displayValue: "999", value: 999, unit: "" },
      },
      {
        it: "should handle numbers that don't need units but exceed maxChars",
        input: 12345,
        options: { maxChars: 3 },
        expected: { displayValue: "9k+", value: 12345, unit: "k" },
      },
      {
        it: "should handle maxChars with custom units",
        input: 15e6,
        options: { maxChars: 7, units: ["", "Kilo", "Mega"] },
        expected: { displayValue: "15Mega", value: 15e6, unit: "Mega" },
      },
      {
        it: "should constrain custom units when they exceed maxChars",
        input: 1.5e6,
        options: { maxChars: 4, units: ["", "k", "M"] },
        expected: { displayValue: "1.5M", value: 1.5e6, unit: "M" },
      },
      {
        it: "should constrain with exactly representable values",
        input: 15000,
        options: { maxChars: 3 },
        expected: { displayValue: "15k", value: 15000, unit: "k" },
      },
      {
        it: "should constrain with approximately representable values",
        input: 15001,
        options: { maxChars: 3 },
        expected: { displayValue: "9k+", value: 15001, unit: "k" },
      },
      {
        it: "should handle maxChars with values that would show plus sign",
        input: 999_999,
        options: { maxChars: 5 },
        expected: { displayValue: "999k+", value: 999999, unit: "k" },
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

describe("humanizeNumberToString", () => {
  it("should return the displayValue as a string", () => {
    const input = 12345;
    const options = { decimals: 2 };
    const expected = "12.34k+"; // Truncates 12.345 to 12.34, then adds "+"
    const result = humanizeNumberToString(input, options);
    expect(result).toBe(expected);
  });
});
