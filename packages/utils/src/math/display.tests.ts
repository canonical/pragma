import { afterEach, beforeEach, describe, expect, it } from "vitest";
import displayNumber, { displayNumberWithUnit } from "./display.js";
import type { DisplayNumberOptions, DisplayNumberResult } from "./types.js";

type TestCase = {
  input: number;
  options?: DisplayNumberOptions;
  expected: string | DisplayNumberResult;
};

describe("displayNumber", () => {
  describe("validation", () => {
    it("automatically adjusts maxLength to minimum of 3", () => {
      expect(displayNumber(1000, { maxLength: 1 })).toBe("1k");
      expect(displayNumber(1000, { maxLength: 2 })).toBe("1k");
      expect(displayNumber(1000, { maxLength: 0 })).toBe("1k");
    });

    it("accepts maxLength of 3 or greater normally", () => {
      expect(() => displayNumber(1000, { maxLength: 3 })).not.toThrow();
      expect(() => displayNumber(1000, { maxLength: 10 })).not.toThrow();
    });
  });

  describe("basic functionality", () => {
    it("handles numbers across all unit ranges", () => {
      const testCases: TestCase[] = [
        // Numbers less than 1000
        { input: 5, expected: "5" },
        { input: 999, expected: "999" },

        // Thousands
        { input: 1000, expected: "1k" },
        { input: 1500, expected: "1.5k" },
        { input: 12000, expected: "12k" },

        // Millions and beyond
        { input: 1000000, expected: "1M" },
        { input: 1500000, expected: "1.5M" },
        { input: 1000000000, expected: "1B" },
        { input: 1500000000000, expected: "1.5T" },
      ];

      testCases.forEach(({ input, options, expected }) => {
        expect(displayNumber(input, options)).toBe(expected);
      });
    });

    it("handles precision and overflow indicators", () => {
      const testCases: TestCase[] = [
        { input: 1001, expected: "1k+" },
        { input: 1234567, options: { maxLength: 7 }, expected: "1.234M+" },
        { input: 999999, expected: "99k+" },
        { input: 132456789, options: { maxLength: 8 }, expected: "132.45M+" },
      ];

      testCases.forEach(({ input, options, expected }) => {
        expect(displayNumber(input, options)).toBe(expected);
      });
    });
  });

  describe("length control", () => {
    it("respects different maxLength values", () => {
      const testCases: TestCase[] = [
        { input: 1200, options: { maxLength: 3 }, expected: "1k+" },
        { input: 1200, options: { maxLength: 4 }, expected: "1.2k" },
        { input: 1234, options: { maxLength: 6 }, expected: "1,234" },
        { input: 132456789, options: { maxLength: 8 }, expected: "132.45M+" },
      ];

      testCases.forEach(({ input, options, expected }) => {
        expect(displayNumber(input, options)).toBe(expected);
      });
    });

    it("handles progressive length increases", () => {
      const input = 1234567;
      expect(displayNumber(input, { maxLength: 3 })).toBe("1M+");
      expect(displayNumber(input, { maxLength: 5 })).toBe("1.2M+");
      expect(displayNumber(input, { maxLength: 7 })).toBe("1.234M+");
      expect(displayNumber(input, { maxLength: 9 })).toBe("1,234,567");
    });
  });

  describe("custom options", () => {
    it("supports custom units", () => {
      const testCases: TestCase[] = [
        {
          input: 1500,
          options: { units: ["", "K", "M", "G"] },
          expected: "1.5K",
        },
        {
          input: 1500000,
          options: { units: ["", "K", "M", "G"] },
          expected: "1.5M",
        },
      ];

      testCases.forEach(({ input, options, expected }) => {
        expect(displayNumber(input, options)).toBe(expected);
      });
    });

    it("supports locale-aware formatting", () => {
      expect(
        displayNumber(1234567, { maxLength: 10, overflowStrategy: "truncate" }),
      ).toBe("1,234,567");
    });
  });

  describe("overflow strategies", () => {
    describe("compact strategy (default)", () => {
      it("uses unit suffixes when possible", () => {
        const testCases: TestCase[] = [
          { input: 1500, options: { maxLength: 3 }, expected: "1k+" },
          { input: 1500, options: { maxLength: 4 }, expected: "1.5k" },
          { input: 12345678, options: { maxLength: 4 }, expected: "12M+" },
        ];

        testCases.forEach(({ input, options, expected }) => {
          expect(
            displayNumber(input, { ...options, overflowStrategy: "compact" }),
          ).toBe(expected);
        });
      });

      it("handles boundaries correctly", () => {
        expect(displayNumber(999, { overflowStrategy: "compact" })).toBe("999");
        expect(displayNumber(1000, { overflowStrategy: "compact" })).toBe("1k");
        expect(displayNumber(1001, { overflowStrategy: "compact" })).toBe(
          "1k+",
        );
      });
    });

    describe("truncate strategy", () => {
      it("shows maximum digits with overflow indicator", () => {
        const testCases: TestCase[] = [
          { input: 1500, options: { maxLength: 3 }, expected: "99+" },
          { input: 1500, options: { maxLength: 4 }, expected: "999+" },
          { input: 12345678, options: { maxLength: 4 }, expected: "999+" },
        ];

        testCases.forEach(({ input, options, expected }) => {
          expect(
            displayNumber(input, { ...options, overflowStrategy: "truncate" }),
          ).toBe(expected);
        });
      });

      it("handles decimal inputs", () => {
        expect(
          displayNumber(1500.7, { maxLength: 4, overflowStrategy: "truncate" }),
        ).toBe("999+");
        expect(
          displayNumber(999.999, {
            maxLength: 6,
            overflowStrategy: "truncate",
          }),
        ).toBe("999.9+");
        expect(
          displayNumber(0.1, { maxLength: 4, overflowStrategy: "truncate" }),
        ).toBe("0.1");
        expect(
          displayNumber(0.123456, {
            maxLength: 4,
            overflowStrategy: "truncate",
          }),
        ).toBe("0.1+");
      });

      it("ignores custom units", () => {
        expect(
          displayNumber(1500, {
            maxLength: 4,
            units: ["", "K", "M"],
            overflowStrategy: "truncate",
          }),
        ).toBe("999+");
        expect(
          displayNumber(1000000, {
            maxLength: 5,
            units: ["", "custom"],
            overflowStrategy: "truncate",
          }),
        ).toBe("999+");
      });

      it("handles extreme values", () => {
        expect(
          displayNumber(1e15, { maxLength: 4, overflowStrategy: "truncate" }),
        ).toBe("999+");
        expect(
          displayNumber(Infinity, {
            maxLength: 4,
            overflowStrategy: "truncate",
          }),
        ).toBe("99T+");
      });
    });

    it("produces different results when strategies diverge", () => {
      const testCases = [
        {
          input: 1500,
          options: { maxLength: 3 },
          compactExpected: "1k+",
          truncateExpected: "99+",
        },
        {
          input: 12345,
          options: { maxLength: 3 },
          compactExpected: "9k+",
          truncateExpected: "99+",
        },
      ];

      testCases.forEach(
        ({ input, options, compactExpected, truncateExpected }) => {
          expect(
            displayNumber(input, { ...options, overflowStrategy: "compact" }),
          ).toBe(compactExpected);
          expect(
            displayNumber(input, { ...options, overflowStrategy: "truncate" }),
          ).toBe(truncateExpected);
        },
      );
    });

    it("produces identical results when both strategies fit", () => {
      const testCases = [
        { input: 500, options: { maxLength: 5 }, expected: "500" },
        { input: 1500, options: { maxLength: 5 }, expected: "1,500" },
      ];

      testCases.forEach(({ input, options, expected }) => {
        const compactResult = displayNumber(input, {
          ...options,
          overflowStrategy: "compact",
        });
        const truncateResult = displayNumber(input, {
          ...options,
          overflowStrategy: "truncate",
        });
        expect(compactResult).toBe(expected);
        expect(truncateResult).toBe(expected);
      });
    });
  });

  describe("locale formatting", () => {
    const originalToLocaleString = Number.prototype.toLocaleString;

    afterEach(() => {
      Number.prototype.toLocaleString = originalToLocaleString;
    });

    describe("US locale (en-US)", () => {
      beforeEach(() => {
        Number.prototype.toLocaleString = function () {
          return originalToLocaleString.call(this, "en-US");
        };
      });

      it("handles thousands separators", () => {
        expect(
          displayNumber(1234567, {
            maxLength: 10,
            overflowStrategy: "truncate",
          }),
        ).toBe("1,234,567");
        expect(
          displayNumber(12345, { maxLength: 8, overflowStrategy: "truncate" }),
        ).toBe("12,345");
      });

      it("handles decimal values", () => {
        expect(displayNumber(1234.56, { maxLength: 8 })).toBe("1,234.56");
        expect(displayNumber(999.99, { maxLength: 6 })).toBe("999.99");
        expect(displayNumber(9999.99, { maxLength: 7 })).toBe("9.999k+");
        expect(displayNumber(9999.99, { maxLength: 8 })).toBe("9,999.99");
      });

      it("handles both separators and decimals", () => {
        expect(displayNumber(1234567.89, { maxLength: 12 })).toBe(
          "1,234,567.89",
        );
        expect(
          displayNumber(12345.67, {
            maxLength: 10,
            overflowStrategy: "truncate",
          }),
        ).toBe("12,345.67");
      });
    });

    describe("German locale (de-DE)", () => {
      beforeEach(() => {
        Number.prototype.toLocaleString = function () {
          return originalToLocaleString.call(this, "de-DE");
        };
      });

      it("handles thousands separators with dots", () => {
        expect(
          displayNumber(1234567, {
            maxLength: 10,
            overflowStrategy: "truncate",
          }),
        ).toBe("1.234.567");
        expect(
          displayNumber(12345, { maxLength: 8, overflowStrategy: "truncate" }),
        ).toBe("12.345");
      });

      it("handles decimal values", () => {
        expect(displayNumber(1234.56, { maxLength: 8 })).toBe("1.234,56");
        expect(displayNumber(999.99, { maxLength: 6 })).toBe("999,99");
        expect(displayNumber(9999.99, { maxLength: 7 })).toBe("9.999k+");
        expect(displayNumber(9999.99, { maxLength: 8 })).toBe("9.999,99");
      });

      it("handles both separators and decimals", () => {
        expect(displayNumber(1234567.89, { maxLength: 12 })).toBe(
          "1.234.567,89",
        );
        expect(
          displayNumber(12345.67, {
            maxLength: 10,
            overflowStrategy: "truncate",
          }),
        ).toBe("12.345,67");
      });
    });

    describe("French locale (fr-FR)", () => {
      beforeEach(() => {
        Number.prototype.toLocaleString = function () {
          return originalToLocaleString.call(this, "fr-FR");
        };
      });

      it("handles thousands separators with spaces", () => {
        const result = displayNumber(1234567, {
          maxLength: 10,
          overflowStrategy: "truncate",
        });
        // French locale uses narrow non-breaking space (U+202F) or regular space
        expect(result).toMatch(/^1[\s\u202F]234[\s\u202F]567$/);

        const result2 = displayNumber(12345, {
          maxLength: 8,
          overflowStrategy: "truncate",
        });
        expect(result2).toMatch(/^12[\s\u202F]345$/);
      });

      it("handles decimal values", () => {
        expect(displayNumber(1234.56, { maxLength: 8 })).toBe("1\u202F234,56");
        expect(displayNumber(999.99, { maxLength: 6 })).toBe("999,99");
      });

      it("handles both separators and decimals", () => {
        expect(displayNumber(1234567.89, { maxLength: 12 })).toBe(
          "1\u202F234\u202F567,89",
        );

        expect(
          displayNumber(12345.67, {
            maxLength: 10,
            overflowStrategy: "truncate",
          }),
        ).toBe("12\u202F345,67");
      });
    });

    describe("Indian locale (en-IN)", () => {
      beforeEach(() => {
        Number.prototype.toLocaleString = function () {
          return originalToLocaleString.call(this, "en-IN");
        };
      });

      it("handles Indian grouping pattern", () => {
        expect(
          displayNumber(1234567, {
            maxLength: 10,
            overflowStrategy: "truncate",
          }),
        ).toBe("12,34,567");
        expect(
          displayNumber(123456, { maxLength: 9, overflowStrategy: "truncate" }),
        ).toBe("1,23,456");
      });

      it("handles decimal values", () => {
        expect(displayNumber(1234.56, { maxLength: 8 })).toBe("1,234.56");
        expect(displayNumber(999.99, { maxLength: 6 })).toBe("999.99");
      });

      it("handles both separators and decimals", () => {
        expect(displayNumber(1234567.89, { maxLength: 12 })).toBe(
          "12,34,567.89",
        );
        expect(
          displayNumber(123456.78, {
            maxLength: 12,
            overflowStrategy: "truncate",
          }),
        ).toBe("1,23,456.78");
      });
    });

    it("handles locale-aware overflow indicators", () => {
      Number.prototype.toLocaleString = function () {
        return originalToLocaleString.call(this, "en-US");
      };
      expect(
        displayNumber(123456, { maxLength: 6, overflowStrategy: "truncate" }),
      ).toBe("9,999+");
    });
  });

  describe("edge cases", () => {
    it("handles unusual input numbers", () => {
      const testCases: TestCase[] = [
        { input: 0, expected: "0" },
        { input: -100, expected: "0" },
        { input: NaN, expected: "0" },
        { input: Infinity, expected: "99T+" },
        { input: Number.MAX_SAFE_INTEGER, expected: "99T+" },
      ];

      testCases.forEach(({ input, options, expected }) => {
        expect(displayNumber(input, options)).toBe(expected);
      });
    });

    it("handles decimal edge cases", () => {
      const testCases: TestCase[] = [
        { input: 0.1, expected: "0.1" },
        { input: 0.1 + 0.2, expected: "0.3+" },
        { input: 0.001, expected: "0+" },
        { input: 999.999, options: { maxLength: 6 }, expected: "999.9+" },
        { input: 1500.7, options: { maxLength: 5 }, expected: "1.5k+" },
      ];

      testCases.forEach(({ input, options, expected }) => {
        expect(displayNumber(input, options)).toBe(expected);
      });
    });

    it("handles custom units configurations", () => {
      expect(displayNumber(1500, { units: [""], maxLength: 5 })).toBe("1,500");
      expect(displayNumber(1500, { units: [""] })).toBe("999+");
      expect(
        displayNumber(1000, {
          units: ["", "thousand", "million"],
          maxLength: 5,
        }),
      ).toBe("1,000");
    });

    it("handles extreme maxLength values", () => {
      expect(displayNumber(1234567890, { maxLength: 15 })).toBe(
        "1,234,567,890",
      );
      expect(displayNumber(1000, { maxLength: 3 })).toBe("1k");
    });
  });
});

describe("displayNumberWithUnit", () => {
  it("returns complete result object", () => {
    const result = displayNumberWithUnit(1500000);
    expect(result).toEqual({
      displayValue: "1.5M",
      unitSuffix: "M",
      unitIndex: 2,
    });
  });

  it("provides unit information for conditional logic", () => {
    const testCases: Array<TestCase & { expected: DisplayNumberResult }> = [
      {
        input: 500,
        expected: { displayValue: "500", unitSuffix: "", unitIndex: 0 },
      },
      {
        input: 1500,
        expected: { displayValue: "1.5k", unitSuffix: "k", unitIndex: 1 },
      },
      {
        input: 1500000,
        expected: { displayValue: "1.5M", unitSuffix: "M", unitIndex: 2 },
      },
    ];

    testCases.forEach(({ input, options, expected }) => {
      expect(displayNumberWithUnit(input, options)).toEqual(expected);
    });
  });
});
