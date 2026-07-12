import { describe, expect, it } from "vitest";
import normalizeNames from "./normalizeNames.js";

describe("normalizeNames", () => {
  it("keeps non-empty strings from an array", () => {
    expect(normalizeNames(["Button", "", "Card", 3, null])).toEqual([
      "Button",
      "Card",
    ]);
  });

  it("falls back to the legacy single name", () => {
    expect(normalizeNames(undefined, "Button")).toEqual(["Button"]);
  });

  it("returns empty for missing input", () => {
    expect(normalizeNames(undefined, undefined)).toEqual([]);
    expect(normalizeNames(undefined, "")).toEqual([]);
  });
});
