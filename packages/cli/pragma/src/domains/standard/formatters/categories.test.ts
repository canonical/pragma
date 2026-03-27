import { describe, expect, it } from "vitest";
import type { CategorySummary } from "../../shared/types/index.js";
import formatters from "./categories.js";

const CATEGORIES: CategorySummary[] = [
  { name: "code", standardCount: 1 },
  { name: "react", standardCount: 2 },
];

describe("formatters.plain", () => {
  it("renders singular for count 1", () => {
    const text = formatters.plain(CATEGORIES);
    expect(text).toContain("code (1 standard)");
  });

  it("renders plural for count > 1", () => {
    const text = formatters.plain(CATEGORIES);
    expect(text).toContain("react (2 standards)");
  });
});

describe("formatters.llm", () => {
  it("renders markdown heading and bold names", () => {
    const text = formatters.llm(CATEGORIES);
    expect(text).toContain("## Standard Categories");
    expect(text).toContain("**react** (2)");
  });
});

describe("formatters.json", () => {
  it("returns valid JSON array", () => {
    const text = formatters.json(CATEGORIES);
    const parsed = JSON.parse(text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe("code");
    expect(parsed[0].standardCount).toBe(1);
  });

  it("returns empty array for empty list", () => {
    const text = formatters.json([]);
    expect(JSON.parse(text)).toEqual([]);
  });
});
