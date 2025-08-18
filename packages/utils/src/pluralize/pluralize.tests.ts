import { describe, expect, it } from "vitest";
import pluralize from "./pluralize.js";

type TestCase = {
  it: string;
  input: number;
  options?: Parameters<typeof pluralize>[1];
  expected: ReturnType<typeof pluralize>;
};

describe("pluralize", () => {
  describe("Basic Functionality", () => {
    const testCases: TestCase[] = [
      {
        it: "should return default singular form for count of 1",
        input: 1,
        expected: "item",
      },
      {
        it: "should return default plural form for count of 0",
        input: 0,
        expected: "items",
      },
      {
        it: "should return default plural form for count of 2",
        input: 2,
        expected: "items",
      },
      {
        it: "should return default plural form for negative numbers",
        input: -1,
        expected: "items",
      },
      {
        it: "should return default plural form for decimal numbers",
        input: 1.5,
        expected: "items",
      },
    ];

    testCases.forEach(({ it: testName, input, options, expected }) => {
      it(testName, () => {
        const result = pluralize(input, options || {});
        expect(result).toBe(expected);
      });
    });
  });

  describe("Custom Singular Stem", () => {
    const testCases: TestCase[] = [
      {
        it: "should use custom singular stem for count of 1",
        input: 1,
        options: { singularStem: "cat" },
        expected: "cat",
      },
      {
        it: "should pluralize custom singular stem with default suffix",
        input: 2,
        options: { singularStem: "cat" },
        expected: "cats",
      },
    ];

    testCases.forEach(({ it: testName, input, options, expected }) => {
      it(testName, () => {
        const result = pluralize(input, options || {});
        expect(result).toBe(expected);
      });
    });
  });

  describe("Custom Plural Suffix", () => {
    const testCases: TestCase[] = [
      {
        it: "should use custom singular stem and custom plural suffix",
        input: 2,
        options: { singularStem: "box", pluralSuffix: "es" },
        expected: "boxes",
      },
      {
        it: "should handle empty plural suffix",
        input: 2,
        options: { singularStem: "sheep", pluralSuffix: "" },
        expected: "sheep",
      },
      {
        it: "should andle complex plural suffix",
        input: 5,
        options: {
          singularStem: "city",
          pluralStem: "cit",
          pluralSuffix: "ies",
        },
        expected: "cities",
      },
    ];

    testCases.forEach(({ it: testName, input, options, expected }) => {
      it(testName, () => {
        const result = pluralize(input, options || {});
        expect(result).toBe(expected);
      });
    });
  });

  describe("Edge Cases", () => {
    const testCases: TestCase[] = [
      {
        it: "should handle exactly 1.0 as singular",
        input: 1.0,
        options: { singularStem: "file" },
        expected: "file",
      },
      {
        it: "should handle 1.1 as plural",
        input: 1.1,
        options: { singularStem: "file" },
        expected: "files",
      },
      {
        it: "should handle 0.9 as plural",
        input: 0.9,
        options: { singularStem: "file" },
        expected: "files",
      },
      {
        it: "should handle NaN as plural",
        input: NaN,
        options: { singularStem: "file" },
        expected: "files",
      },
      {
        it: "should handle Infinity as plural",
        input: Infinity,
        options: { singularStem: "file" },
        expected: "files",
      },
      {
        it: "should handle -Infinity as plural",
        input: -Infinity,
        options: { singularStem: "file" },
        expected: "files",
      },
      {
        it: "should handle very large numbers as plural",
        input: 1e10,
        options: { singularStem: "star" },
        expected: "stars",
      },
      {
        it: "should handle very small positive numbers as plural",
        input: 1e-10,
        options: { singularStem: "particle" },
        expected: "particles",
      },
    ];

    testCases.forEach(({ it: testName, input, options, expected }) => {
      it(testName, () => {
        const result = pluralize(input, options || {});
        expect(result).toBe(expected);
      });
    });
  });
});
