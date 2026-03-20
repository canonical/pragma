import type { URI } from "@canonical/ke";
import { describe, expect, it } from "vitest";
import type { StandardSummary } from "../../shared/types.js";
import formatters from "./list.js";

const SUMMARY: StandardSummary = {
  uri: "http://example.com/s1" as URI,
  name: "react/component/folder-structure",
  category: "react",
  description: "Components must follow the standard folder layout",
};

describe("formatters.plain", () => {
  it("renders name with category and description", () => {
    const text = formatters.plain([SUMMARY]);
    expect(text).toContain("react/component/folder-structure [react]");
    expect(text).toContain("  Components must follow");
  });

  it("omits category brackets when empty", () => {
    const text = formatters.plain([{ ...SUMMARY, category: "" }]);
    expect(text).not.toContain("[");
  });
});

describe("formatters.llm", () => {
  it("renders markdown heading and bold names", () => {
    const text = formatters.llm([SUMMARY]);
    expect(text).toContain("## Standards");
    expect(text).toContain("**react/component/folder-structure**");
  });
});

describe("formatters.json", () => {
  it("returns valid JSON array", () => {
    const text = formatters.json([SUMMARY]);
    const parsed = JSON.parse(text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe("react/component/folder-structure");
  });

  it("returns empty array for empty list", () => {
    const text = formatters.json([]);
    expect(JSON.parse(text)).toEqual([]);
  });
});
