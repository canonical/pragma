import { describe, expect, it } from "vitest";
import extractPreferences from "./extractPreferences.js";

describe("extractPreferences", () => {
  it("returns all nulls for null header", () => {
    expect(extractPreferences(null)).toEqual({
      theme: null,
      contrast: null,
      motion: null,
      shortcuts: null,
    });
  });

  it("returns all nulls for empty header", () => {
    expect(extractPreferences("")).toEqual({
      theme: null,
      contrast: null,
      motion: null,
      shortcuts: null,
    });
  });

  it("extracts theme only", () => {
    expect(extractPreferences("theme=dark")).toEqual({
      theme: "dark",
      contrast: null,
      motion: null,
      shortcuts: null,
    });
  });

  it("extracts shortcuts only", () => {
    expect(extractPreferences("shortcuts=off")).toEqual({
      theme: null,
      contrast: null,
      motion: null,
      shortcuts: "off",
    });
  });

  it("extracts every preference at once", () => {
    expect(
      extractPreferences(
        "theme=light; contrast=more; motion=reduce; shortcuts=off",
      ),
    ).toEqual({
      theme: "light",
      contrast: "more",
      motion: "reduce",
      shortcuts: "off",
    });
  });

  it("ignores unrelated cookies", () => {
    expect(extractPreferences("session=abc123; theme=dark; lang=en")).toEqual({
      theme: "dark",
      contrast: null,
      motion: null,
      shortcuts: null,
    });
  });
});
