import { describe, expect, it } from "vitest";
import expandGlob, { isGlobPattern } from "./expandGlob.js";

const standardNames = [
  "react.component.props",
  "react.component.structure.folder",
  "react.component.barrel_exports",
  "react.hooks.naming",
  "css.selectors.namespace",
  "css.selectors.specificity",
  "css.component.encapsulation",
  "git.branch.name",
  "git.commit.message",
];

describe("expandGlob", () => {
  it("T5-1: expands react.component.* to all matching entries", () => {
    const result = expandGlob("react.component.*", standardNames);
    expect(result).toContain("react.component.props");
    expect(result).toContain("react.component.structure.folder");
    expect(result).toContain("react.component.barrel_exports");
    expect(result).not.toContain("react.hooks.naming");
    expect(result).toHaveLength(3);
  });

  it("T5-2: expands css.* to all CSS entries", () => {
    const result = expandGlob("css.*", standardNames);
    expect(result).toHaveLength(3);
    expect(result).toContain("css.selectors.namespace");
  });

  it("T5-3: expands prefix wildcard against plain names", () => {
    const names = ["NavigationBar", "NavigationMenu", "Button"];
    expect(expandGlob("Nav*", names)).toEqual([
      "NavigationBar",
      "NavigationMenu",
    ]);
  });

  it("T5-4: full wildcard returns all candidates", () => {
    expect(expandGlob("*", ["A", "B", "C"])).toEqual(["A", "B", "C"]);
  });

  it("T5-5: unmatched glob returns empty", () => {
    expect(expandGlob("nonexistent.*", standardNames)).toEqual([]);
  });

  it("T5-6: non-glob name passes through unchanged", () => {
    expect(expandGlob("Button", ["Button", "Card"])).toEqual(["Button"]);
  });

  it("T5-7: trailing dot treated as prefix glob", () => {
    const withDot = expandGlob("react.component.", standardNames);
    const withStar = expandGlob("react.component.*", standardNames);
    expect(withDot).toEqual(withStar);
  });

  it("T5-8: suffix wildcard matches end of name", () => {
    const result = expandGlob("*.props", [
      "react.component.props",
      "react.component.props.wrapper",
      "css.selectors.namespace",
    ]);
    expect(result).toEqual(["react.component.props"]);
  });

  it("matches case-insensitively", () => {
    expect(expandGlob("REACT.*", standardNames)).toHaveLength(4);
  });
});

describe("isGlobPattern", () => {
  it("T5-9: detects star pattern", () => {
    expect(isGlobPattern("react.component.*")).toBe(true);
  });

  it("T5-10: detects prefix star", () => {
    expect(isGlobPattern("Nav*")).toBe(true);
  });

  it("T5-11: detects trailing dot", () => {
    expect(isGlobPattern("react.component.")).toBe(true);
  });

  it("T5-12: rejects plain name", () => {
    expect(isGlobPattern("Button")).toBe(false);
  });

  it("T5-13: rejects empty string", () => {
    expect(isGlobPattern("")).toBe(false);
  });
});
