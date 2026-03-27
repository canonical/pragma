import type { URI } from "@canonical/ke";
import { describe, expect, it } from "vitest";
import type {
  StandardDetailed,
  StandardSummary,
} from "../../shared/types/index.js";
import formatters from "./list.js";
import type { StandardListOutput } from "./types.js";

const SUMMARY: StandardSummary = {
  uri: "http://example.com/s1" as URI,
  name: "react/component/folder-structure",
  category: "react",
  description: "Components must follow the standard folder layout",
};

const DETAIL: StandardDetailed = {
  ...SUMMARY,
  dos: [
    { language: "typescript", code: "export function Button() { ... }" },
    { language: "typescript", code: "export function Input() { ... }" },
  ],
  donts: [
    { language: "typescript", code: "export default class Button { ... }" },
  ],
};

function summaryOutput(items: readonly StandardSummary[]): StandardListOutput {
  return { items, disclosure: { level: "summary" } };
}

function digestOutput(
  items: readonly StandardSummary[],
  details: readonly (StandardDetailed | null)[],
  maxExampleLength?: number,
): StandardListOutput {
  return {
    items,
    details,
    disclosure: { level: "digest", maxExampleLength },
  };
}

function detailedOutput(
  items: readonly StandardSummary[],
  details: readonly (StandardDetailed | null)[],
): StandardListOutput {
  return { items, details, disclosure: { level: "detailed" } };
}

// ---------------------------------------------------------------------------
// Summary (default)
// ---------------------------------------------------------------------------

describe("formatters.plain — summary", () => {
  it("renders name with category and description", () => {
    const text = formatters.plain(summaryOutput([SUMMARY]));
    expect(text).toContain("react/component/folder-structure [react]");
    expect(text).toContain("  Components must follow");
  });

  it("omits category brackets when empty", () => {
    const text = formatters.plain(
      summaryOutput([{ ...SUMMARY, category: "" }]),
    );
    expect(text).not.toContain("[");
  });
});

describe("formatters.llm — summary", () => {
  it("renders markdown heading and bold names", () => {
    const text = formatters.llm(summaryOutput([SUMMARY]));
    expect(text).toContain("## Standards");
    expect(text).toContain("**react/component/folder-structure**");
  });
});

describe("formatters.json — summary", () => {
  it("returns valid JSON array", () => {
    const text = formatters.json(summaryOutput([SUMMARY]));
    const parsed = JSON.parse(text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe("react/component/folder-structure");
  });

  it("returns empty array for empty list", () => {
    const text = formatters.json(summaryOutput([]));
    expect(JSON.parse(text)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Digest
// ---------------------------------------------------------------------------

describe("formatters.plain — digest", () => {
  it("includes first do example", () => {
    const text = formatters.plain(digestOutput([SUMMARY], [DETAIL]));
    expect(text).toContain("Example: export function Button()");
  });

  it("truncates long examples", () => {
    const text = formatters.plain(digestOutput([SUMMARY], [DETAIL], 20));
    expect(text).toContain("Example: ");
    // Truncated to 20 chars (19 + ellipsis)
    const exampleLine = text.split("\n").find((l) => l.includes("Example:"));
    expect(exampleLine).toBeDefined();
    if (!exampleLine) {
      throw new Error("Expected example line");
    }
    // 20 char max means the example text portion is at most 20 chars
    const exampleText = exampleLine.replace(/.*Example: /, "");
    expect(exampleText.length).toBeLessThanOrEqual(20);
  });

  it("omits example when detail is null", () => {
    const text = formatters.plain(digestOutput([SUMMARY], [null]));
    expect(text).not.toContain("Example:");
  });
});

describe("formatters.llm — digest", () => {
  it("includes first do example in backticks", () => {
    const text = formatters.llm(digestOutput([SUMMARY], [DETAIL]));
    expect(text).toContain("Example: `export function Button()");
  });
});

describe("formatters.json — digest", () => {
  it("includes example field in enriched items", () => {
    const text = formatters.json(digestOutput([SUMMARY], [DETAIL]));
    const parsed = JSON.parse(text);
    expect(parsed[0].example).toBeDefined();
    expect(parsed[0].example).toContain("export function Button()");
  });
});

// ---------------------------------------------------------------------------
// Detailed
// ---------------------------------------------------------------------------

describe("formatters.plain — detailed", () => {
  it("includes full dos and donts", () => {
    const text = formatters.plain(detailedOutput([SUMMARY], [DETAIL]));
    expect(text).toContain("Do:");
    expect(text).toContain("export function Button()");
    expect(text).toContain("export function Input()");
    expect(text).toContain("Don't:");
    expect(text).toContain("export default class Button");
  });
});

describe("formatters.llm — detailed", () => {
  it("includes dos and donts in markdown", () => {
    const text = formatters.llm(detailedOutput([SUMMARY], [DETAIL]));
    expect(text).toContain("**Do**:");
    expect(text).toContain("**Don't**:");
  });
});

describe("formatters.json — detailed", () => {
  it("includes dos and donts arrays", () => {
    const text = formatters.json(detailedOutput([SUMMARY], [DETAIL]));
    const parsed = JSON.parse(text);
    expect(parsed[0].dos).toHaveLength(2);
    expect(parsed[0].donts).toHaveLength(1);
  });
});
