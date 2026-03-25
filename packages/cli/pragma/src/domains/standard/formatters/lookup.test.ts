import type { URI } from "@canonical/ke";
import { describe, expect, it } from "vitest";
import type { StandardDetailed } from "../../shared/types.js";
import formatters from "./lookup.js";

const DETAILED: StandardDetailed = {
  uri: "http://example.com/s1" as URI,
  name: "react/component/folder-structure",
  category: "react",
  description: "Components must follow the standard folder layout",
  dos: [
    { language: "typescript", code: "Place files in src/lib/" },
    { language: "typescript", code: "Include index.ts barrel" },
  ],
  donts: [{ language: "typescript", code: "Use flat directory" }],
};

describe("formatters.plain", () => {
  it("renders summary without dos/donts by default", () => {
    const text = formatters.plain({ standard: DETAILED, detailed: false });
    expect(text).toContain("react/component/folder-structure");
    expect(text).toContain("URI: http://example.com/s1");
    expect(text).toContain("Category: react");
    expect(text).toContain("Description:");
    expect(text).not.toContain("Do:");
    expect(text).not.toContain("Don't:");
  });

  it("renders dos and donts when detailed", () => {
    const text = formatters.plain({ standard: DETAILED, detailed: true });
    expect(text).toContain("Do:");
    expect(text).toContain("  Place files in src/lib/");
    expect(text).toContain("Don't:");
    expect(text).toContain("  Use flat directory");
  });

  it("renders dash for empty category", () => {
    const text = formatters.plain({
      standard: { ...DETAILED, category: "" },
      detailed: false,
    });
    expect(text).toContain("Category: —");
  });

  it("renders extends when present", () => {
    const text = formatters.plain({
      standard: { ...DETAILED, extends: "react/component/base" },
      detailed: false,
    });
    expect(text).toContain("Extends: react/component/base");
  });
});

describe("formatters.llm", () => {
  it("renders markdown heading", () => {
    const text = formatters.llm({ standard: DETAILED, detailed: false });
    expect(text).toContain("## react/component/folder-structure");
    expect(text).toContain("URI: http://example.com/s1");
    expect(text).not.toContain("### Do");
  });

  it("renders extends in llm output when present", () => {
    const text = formatters.llm({
      standard: { ...DETAILED, extends: "cs:react_base" },
      detailed: false,
    });
    expect(text).toContain("Extends: cs:react_base");
  });

  it("renders do/dont sections when detailed", () => {
    const text = formatters.llm({ standard: DETAILED, detailed: true });
    expect(text).toContain("### Do");
    expect(text).toContain("### Don't");
    expect(text).toContain("- Place files in src/lib/");
  });
});

describe("formatters.json", () => {
  it("includes dos/donts when detailed", () => {
    const parsed = JSON.parse(
      formatters.json({ standard: DETAILED, detailed: true }),
    );
    expect(parsed.dos).toHaveLength(2);
    expect(parsed.donts).toHaveLength(1);
  });

  it("omits dos/donts when not detailed", () => {
    const parsed = JSON.parse(
      formatters.json({ standard: DETAILED, detailed: false }),
    );
    expect(parsed.dos).toBeUndefined();
    expect(parsed.donts).toBeUndefined();
    expect(parsed.name).toBe("react/component/folder-structure");
  });
});
