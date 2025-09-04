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
  describe("Default Round Mode", () => {
    const testCases: TestCase[] = [
      {
        it: "returns numbers without unit when below magnitude threshold",
        input: 999,
        expected: { displayValue: "999", value: 999, unit: "" },
      },
      {
        it: "applies unit when reaching magnitude threshold",
        input: 1000,
        expected: { displayValue: "1k", value: 1000, unit: "k" },
      },
      {
        it: "truncates to 3 characters and applies appropriate unit",
        input: 1500,
        expected: { displayValue: "1.5k", value: 1500, unit: "k" },
      },
      {
        it: "handles larger numbers with proper unit scaling",
        input: 12345,
        expected: { displayValue: "12k", value: 12345, unit: "k" },
      },
      {
        it: "scales to millions unit for large values",
        input: 1.5e6,
        expected: { displayValue: "1.5M", value: 1500000, unit: "M" },
      },
      {
        it: "scales to billions unit for very large values",
        input: 1.5e9,
        expected: { displayValue: "1.5B", value: 1500000000, unit: "B" },
      },
      {
        it: "scales to trillions unit for extremely large values",
        input: 1.5e12,
        expected: {
          displayValue: "1.5T",
          value: 1500000000000,
          unit: "T",
        },
      },
      {
        it: "floors decimal inputs before applying units",
        input: 12345.67,
        expected: { displayValue: "12k", value: 12345.67, unit: "k" },
      },
    ];

    testCases.forEach(({ it: testName, input, options, expected }) => {
      it(testName, () => {
        const result = humanizeNumber(input, options);
        expect(result).toEqual(expected);
      });
    });
  });

  describe("Clamp Mode", () => {
    const testCases: TestCase[] = [
      {
        it: "clamps values above maximum and adds overflow indicator",
        input: 1500,
        options: { humanizeType: "clamp", clampOptions: { max: 999 } },
        expected: { displayValue: "999+", value: 1500, unit: "" },
      },
      {
        it: "clamps values below minimum to minimum value",
        input: 50,
        options: { humanizeType: "clamp", clampOptions: { min: 100 } },
        expected: { displayValue: "100", value: 50, unit: "" },
      },
      {
        it: "returns value unchanged when within min/max bounds",
        input: 500,
        options: {
          humanizeType: "clamp",
          clampOptions: { min: 100, max: 999 },
        },
        expected: { displayValue: "500", value: 500, unit: "" },
      },
      {
        it: "uses custom overflow indicator when provided",
        input: 1500,
        options: {
          humanizeType: "clamp",
          clampOptions: { max: 999 },
          overflowIndicator: "++",
        },
        expected: { displayValue: "999++", value: 1500, unit: "" },
      },
    ];

    testCases.forEach(({ it: testName, input, options, expected }) => {
      it(testName, () => {
        const result = humanizeNumber(input, options);
        expect(result).toEqual(expected);
      });
    });
  });

  describe("Custom Configuration", () => {
    it("accepts custom unit arrays for different naming conventions", () => {
      const input = 1.5e6;
      const options = { units: ["", "Kilo", "Mega"] };
      const expected = {
        displayValue: "1.5Mega",
        value: 1500000,
        unit: "Mega",
      };
      const result = humanizeNumber(input, options);
      expect(result).toEqual(expected);
    });

    it("supports custom magnitude base for binary unit systems", () => {
      const input = 2048;
      const options = { magnitudeBase: 1024, units: ["B", "KiB", "MiB"] };
      const expected = { displayValue: "2KiB", value: 2048, unit: "KiB" };
      const result = humanizeNumber(input, options);
      expect(result).toEqual(expected);
    });
  });

  describe("Edge Cases", () => {
    const testCases: TestCase[] = [
      {
        it: "handles zero input",
        input: 0,
        expected: { displayValue: "0", value: 0, unit: "" },
      },
      {
        it: "handles NaN input by returning NaN string",
        input: NaN,
        expected: { displayValue: "NaN", value: NaN, unit: "" },
      },
      {
        it: "handles positive infinity by returning infinity symbol",
        input: Infinity,
        expected: { displayValue: "∞", value: Infinity, unit: "" },
      },
      {
        it: "handles negative infinity by returning infinity symbol",
        input: -Infinity,
        expected: { displayValue: "∞", value: -Infinity, unit: "" },
      },
      {
        it: "caps at maximum unit when value exceeds all units",
        input: 1e18,
        expected: {
          displayValue: "999T",
          value: 1000000000000000000,
          unit: "T",
        },
      },
      {
        it: "floors negative numbers to zero",
        input: -100,
        expected: { displayValue: "-10", value: -100, unit: "" },
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
