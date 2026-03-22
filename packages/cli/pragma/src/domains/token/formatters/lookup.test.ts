import type { URI } from "@canonical/ke";
import { describe, expect, it } from "vitest";
import type { TokenDetailed } from "../../shared/types.js";
import { createLookupFormatters } from "./lookup.js";

const DETAILED: TokenDetailed = {
  uri: "http://example.com/t1" as URI,
  name: "color.primary",
  category: "Color",
  values: [
    { theme: "light", value: "#0066cc" },
    { theme: "dark", value: "#4d9aff" },
  ],
};

describe("token lookup formatters", () => {
  describe("detailed: false", () => {
    const fmt = createLookupFormatters({ detailed: false });

    it("plain renders summary without values", () => {
      const text = fmt.plain(DETAILED);
      expect(text).toContain("color.primary");
      expect(text).toContain("Category: Color");
      expect(text).not.toContain("Values:");
    });

    it("json omits values", () => {
      const parsed = JSON.parse(fmt.json(DETAILED));
      expect(parsed.name).toBe("color.primary");
      expect(parsed.values).toBeUndefined();
    });
  });

  describe("detailed: true", () => {
    const fmt = createLookupFormatters({ detailed: true });

    it("plain renders values", () => {
      const text = fmt.plain(DETAILED);
      expect(text).toContain("Values:");
      expect(text).toContain("  light: #0066cc");
      expect(text).toContain("  dark: #4d9aff");
    });

    it("llm renders values section", () => {
      const text = fmt.llm(DETAILED);
      expect(text).toContain("### Values");
      expect(text).toContain("- light: `#0066cc`");
    });

    it("json includes values", () => {
      const parsed = JSON.parse(fmt.json(DETAILED));
      expect(parsed.values).toHaveLength(2);
    });
  });

  it("plain renders dash for empty category", () => {
    const fmt = createLookupFormatters({ detailed: false });
    const text = fmt.plain({ ...DETAILED, category: "" });
    expect(text).toContain("Category: —");
  });
});
