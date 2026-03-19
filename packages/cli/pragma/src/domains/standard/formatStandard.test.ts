import type { URI } from "@canonical/ke";
import { describe, expect, it } from "vitest";
import type {
  CategorySummary,
  StandardDetailed,
  StandardSummary,
} from "../shared/types.js";
import {
  formatCategoriesLlm,
  formatCategoriesPlain,
  formatStandardGetLlm,
  formatStandardGetPlain,
  formatStandardJson,
  formatStandardsListLlm,
  formatStandardsListPlain,
} from "./formatStandard.js";

const SUMMARY: StandardSummary = {
  uri: "http://example.com/s1" as URI,
  name: "react/component/folder-structure",
  category: "react",
  description: "Components must follow the standard folder layout",
};

const DETAILED: StandardDetailed = {
  ...SUMMARY,
  dos: [
    { language: "typescript", code: "Place files in src/lib/" },
    { language: "typescript", code: "Include index.ts barrel" },
  ],
  donts: [{ language: "typescript", code: "Use flat directory" }],
};

const CATEGORIES: CategorySummary[] = [
  { name: "code", standardCount: 1 },
  { name: "react", standardCount: 2 },
];

// =============================================================================
// Plain
// =============================================================================

describe("formatStandardsListPlain", () => {
  it("renders name with category and description", () => {
    const text = formatStandardsListPlain([SUMMARY]);
    expect(text).toContain("react/component/folder-structure [react]");
    expect(text).toContain("  Components must follow");
  });

  it("omits category brackets when empty", () => {
    const text = formatStandardsListPlain([{ ...SUMMARY, category: "" }]);
    expect(text).not.toContain("[");
  });
});

describe("formatStandardGetPlain", () => {
  it("renders summary without dos/donts by default", () => {
    const text = formatStandardGetPlain(DETAILED, false);
    expect(text).toContain("react/component/folder-structure");
    expect(text).toContain("Category: react");
    expect(text).toContain("Description:");
    expect(text).not.toContain("Do:");
    expect(text).not.toContain("Don't:");
  });

  it("renders dos and donts when detailed", () => {
    const text = formatStandardGetPlain(DETAILED, true);
    expect(text).toContain("Do:");
    expect(text).toContain("  Place files in src/lib/");
    expect(text).toContain("Don't:");
    expect(text).toContain("  Use flat directory");
  });

  it("renders dash for empty category", () => {
    const text = formatStandardGetPlain({ ...DETAILED, category: "" }, false);
    expect(text).toContain("Category: —");
  });

  it("renders extends when present", () => {
    const text = formatStandardGetPlain(
      { ...DETAILED, extends: "react/component/base" },
      false,
    );
    expect(text).toContain("Extends: react/component/base");
  });
});

describe("formatCategoriesPlain", () => {
  it("renders singular for count 1", () => {
    const text = formatCategoriesPlain(CATEGORIES);
    expect(text).toContain("code (1 standard)");
  });

  it("renders plural for count > 1", () => {
    const text = formatCategoriesPlain(CATEGORIES);
    expect(text).toContain("react (2 standards)");
  });
});

// =============================================================================
// LLM
// =============================================================================

describe("formatStandardsListLlm", () => {
  it("renders markdown heading and bold names", () => {
    const text = formatStandardsListLlm([SUMMARY]);
    expect(text).toContain("## Standards");
    expect(text).toContain("**react/component/folder-structure**");
  });
});

describe("formatStandardGetLlm", () => {
  it("renders markdown heading", () => {
    const text = formatStandardGetLlm(DETAILED, false);
    expect(text).toContain("## react/component/folder-structure");
    expect(text).not.toContain("### Do");
  });

  it("renders do/dont sections when detailed", () => {
    const text = formatStandardGetLlm(DETAILED, true);
    expect(text).toContain("### Do");
    expect(text).toContain("### Don't");
    expect(text).toContain("- Place files in src/lib/");
  });
});

describe("formatCategoriesLlm", () => {
  it("renders markdown heading and bold names", () => {
    const text = formatCategoriesLlm(CATEGORIES);
    expect(text).toContain("## Standard Categories");
    expect(text).toContain("**react** (2)");
  });
});

// =============================================================================
// JSON
// =============================================================================

describe("formatStandardJson", () => {
  it("includes dos/donts when detailed", () => {
    const parsed = JSON.parse(formatStandardJson(DETAILED, true));
    expect(parsed.dos).toHaveLength(2);
    expect(parsed.donts).toHaveLength(1);
  });

  it("omits dos/donts when not detailed", () => {
    const parsed = JSON.parse(formatStandardJson(DETAILED, false));
    expect(parsed.dos).toBeUndefined();
    expect(parsed.donts).toBeUndefined();
    expect(parsed.name).toBe("react/component/folder-structure");
  });
});
