import { describe, expect, it } from "vitest";
import extractPreferences from "./extractPreferences.js";

describe("extractPreferences", () => {
  it("returns all nulls for null header", () => {
    expect(extractPreferences(null)).toEqual({
      theme: null,
      contrast: null,
      motion: null,
    });
  });

  it("returns all nulls for empty header", () => {
    expect(extractPreferences("")).toEqual({
      theme: null,
      contrast: null,
      motion: null,
    });
  });

  it("extracts theme only", () => {
    expect(extractPreferences("theme=dark")).toEqual({
      theme: "dark",
      contrast: null,
      motion: null,
    });
  });

  it("extracts all three preferences", () => {
    expect(
      extractPreferences("theme=light; contrast=more; motion=reduce"),
    ).toEqual({
      theme: "light",
      contrast: "more",
      motion: "reduce",
    });
  });

  it("ignores unrelated cookies", () => {
    expect(extractPreferences("session=abc123; theme=dark; lang=en")).toEqual({
      theme: "dark",
      contrast: null,
      motion: null,
    });
  });
});
