import { describe, expect, it } from "vitest";
import { convertCamelToKebab, convertKebabToCamel } from "./convertCase.js";

describe("convertCamelToKebab", () => {
  it("converts camelCase to kebab-case", () => {
    expect(convertCamelToKebab("allTiers")).toBe("all-tiers");
  });

  it("handles single-word names", () => {
    expect(convertCamelToKebab("format")).toBe("format");
  });

  it("handles multiple uppercase letters", () => {
    expect(convertCamelToKebab("dryRunOnly")).toBe("dry-run-only");
  });

  it("handles already lowercase", () => {
    expect(convertCamelToKebab("name")).toBe("name");
  });

  it("handles empty string", () => {
    expect(convertCamelToKebab("")).toBe("");
  });
});

describe("convertKebabToCamel", () => {
  it("converts kebab-case to camelCase", () => {
    expect(convertKebabToCamel("all-tiers")).toBe("allTiers");
  });

  it("handles single-word names", () => {
    expect(convertKebabToCamel("format")).toBe("format");
  });

  it("handles multiple segments", () => {
    expect(convertKebabToCamel("dry-run-only")).toBe("dryRunOnly");
  });

  it("handles empty string", () => {
    expect(convertKebabToCamel("")).toBe("");
  });

  it("roundtrips with convertCamelToKebab", () => {
    const original = "showAllFiles";
    expect(convertKebabToCamel(convertCamelToKebab(original))).toBe(original);
  });
});
