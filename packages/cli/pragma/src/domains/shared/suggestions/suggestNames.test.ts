import { describe, expect, it } from "vitest";
import suggestNames from "./suggestNames.js";

describe("suggestNames", () => {
  it("T1-1: suggests edit-distance match for single-char typo", () => {
    expect(suggestNames("Buton", ["Button", "Card", "Input"])).toEqual([
      "Button",
    ]);
  });

  it("T1-2: suggests dot-separated names with typo in last segment", () => {
    const candidates = [
      "react.component.props",
      "react.component.props.wrapper",
      "react.component.props.html_rendering",
      "react.component.naming",
      "css.selectors.namespace",
    ];
    const result = suggestNames("react.component.prosp", candidates);
    expect(result.at(0)).toBe("react.component.props");
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("T1-3: matches case-insensitively, preserves original casing", () => {
    expect(
      suggestNames("buton-background", ["Button-Background", "color-primary"]),
    ).toEqual(["Button-Background"]);
  });

  it("T1-4: returns prefix matches ranked first", () => {
    const result = suggestNames("Accordion", [
      "AccordionItem",
      "AccordionGroup",
      "Button",
    ]);
    expect(result).toHaveLength(2);
    expect(result).toContain("AccordionItem");
    expect(result).toContain("AccordionGroup");
  });

  it("T1-5: returns empty for completely unrelated input", () => {
    expect(suggestNames("zzzzz", ["Button", "Card", "Input"])).toEqual([]);
  });

  it("T1-6: returns empty for empty query", () => {
    expect(suggestNames("", ["Button"])).toEqual([]);
  });

  it("T1-7: excludes exact matches", () => {
    expect(suggestNames("Button", ["Button", "Card"])).toEqual([]);
  });

  it("T1-8: ranks multiple candidates by distance", () => {
    const result = suggestNames("Buttn", ["Button", "Butter", "Bitten"]);
    expect(result).toContain("Button");
    expect(result).toContain("Butter");
    expect(result.indexOf("Button")).toBeLessThan(result.indexOf("Butter"));
  });

  it("respects maxResults option", () => {
    const candidates = Array.from({ length: 20 }, (_, i) => `Item${i}`);
    const result = suggestNames("Item", candidates, { maxResults: 3 });
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("respects threshold option", () => {
    const result = suggestNames("Buton", ["Button"], { threshold: 0.05 });
    expect(result).toEqual([]);
  });
});
