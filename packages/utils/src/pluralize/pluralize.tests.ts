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

  describe("Custom Singular", () => {
    const testCases: TestCase[] = [
      {
        it: "should use custom singular for count of 1",
        input: 1,
        options: { singular: "cat" },
        expected: "cat",
      },
      {
        it: "should pluralize custom singular with default 's' suffix",
        input: 2,
        options: { singular: "cat" },
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

  describe("Custom Plural Forms", () => {
    const testCases: TestCase[] = [
      {
        it: "should use custom plural form for irregular plurals",
        input: 2,
        options: { singular: "box", plural: "boxes" },
        expected: "boxes",
      },
      {
        it: "should use singular for count of 1 with custom plural",
        input: 1,
        options: { singular: "box", plural: "boxes" },
        expected: "box",
      },
      {
        it: "should handle irregular plurals like children",
        input: 1,
        options: { singular: "child", plural: "children" },
        expected: "child",
      },
      {
        it: "should handle irregular plurals like children for multiple",
        input: 3,
        options: { singular: "child", plural: "children" },
        expected: "children",
      },
      {
        it: "should handle words that don't change in plural",
        input: 1,
        options: { singular: "sheep", plural: "sheep" },
        expected: "sheep",
      },
      {
        it: "should handle words that don't change in plural for multiple",
        input: 5,
        options: { singular: "sheep", plural: "sheep" },
        expected: "sheep",
      },
      {
        it: "should handle complex irregular plurals",
        input: 1,
        options: { singular: "person", plural: "people" },
        expected: "person",
      },
      {
        it: "should handle complex irregular plurals for multiple",
        input: 4,
        options: { singular: "person", plural: "people" },
        expected: "people",
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
        options: { singular: "file" },
        expected: "file",
      },
      {
        it: "should handle 1.1 as plural",
        input: 1.1,
        options: { singular: "file" },
        expected: "files",
      },
      {
        it: "should handle 0.9 as plural",
        input: 0.9,
        options: { singular: "file" },
        expected: "files",
      },
      {
        it: "should handle NaN as plural",
        input: NaN,
        options: { singular: "file" },
        expected: "files",
      },
      {
        it: "should handle Infinity as plural",
        input: Infinity,
        options: { singular: "file" },
        expected: "files",
      },
      {
        it: "should handle -Infinity as plural",
        input: -Infinity,
        options: { singular: "file" },
        expected: "files",
      },
      {
        it: "should handle very large numbers as plural",
        input: 1e10,
        options: { singular: "star" },
        expected: "stars",
      },
      {
        it: "should handle very small positive numbers as plural",
        input: 1e-10,
        options: { singular: "particle" },
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
