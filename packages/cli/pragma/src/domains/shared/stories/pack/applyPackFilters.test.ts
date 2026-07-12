import { describe, expect, it } from "vitest";
import { PragmaError } from "#error";
import applyPackFilters from "./applyPackFilters.js";
import type { StoryPackFilter } from "./types.js";

const ROWS = [
  { name: "Gazpacho", category: "soup" },
  { name: "Pancakes", category: "breakfast" },
];
const FILTERS: StoryPackFilter[] = [
  { param: "category", variable: "category", values: ["breakfast", "soup"] },
];

describe("applyPackFilters", () => {
  it("returns rows unchanged when no filter value is provided", () => {
    expect(applyPackFilters(ROWS, FILTERS, {})).toEqual(ROWS);
  });

  it("returns rows unchanged when no filters are declared", () => {
    expect(applyPackFilters(ROWS, undefined, { category: "soup" })).toEqual(
      ROWS,
    );
  });

  it("keeps only rows matching the provided value", () => {
    const rows = applyPackFilters(ROWS, FILTERS, { category: "soup" });
    expect(rows.map((row) => row.name)).toEqual(["Gazpacho"]);
  });

  it("rejects values outside the declared set", () => {
    expect(() =>
      applyPackFilters(ROWS, FILTERS, { category: "dinner" }),
    ).toThrowError(PragmaError);
    try {
      applyPackFilters(ROWS, FILTERS, { category: "dinner" });
    } catch (error) {
      expect((error as PragmaError).code).toBe("INVALID_INPUT");
      expect((error as PragmaError).recovery?.message).toContain("breakfast");
    }
  });

  it("rejects non-string values and suggests the declared set", () => {
    expect(() => applyPackFilters(ROWS, FILTERS, { category: 3 })).toThrowError(
      PragmaError,
    );
    try {
      applyPackFilters(ROWS, FILTERS, { category: ["soup"] });
    } catch (error) {
      expect((error as PragmaError).validOptions).toEqual([
        "breakfast",
        "soup",
      ]);
    }
  });

  it("canonicalizes case-insensitive input to the declared value", () => {
    const rows = applyPackFilters(ROWS, FILTERS, { category: "SOUP" });
    expect(rows.map((row) => row.name)).toEqual(["Gazpacho"]);
  });

  it("trims surrounding whitespace from the provided value", () => {
    const rows = applyPackFilters(ROWS, FILTERS, { category: "  soup " });
    expect(rows.map((row) => row.name)).toEqual(["Gazpacho"]);
  });

  it("matches unicode values across NFC/NFD normalization forms", () => {
    const filters: StoryPackFilter[] = [
      { param: "kind", variable: "kind", values: ["entr\u00e9e"] },
    ];
    const rows = [{ name: "Salad", kind: "entre\u0301e" }];
    expect(
      applyPackFilters(rows, filters, { kind: "entre\u0301e" }),
    ).toHaveLength(1);
  });

  it("never matches rows without a binding for the variable", () => {
    const rows = [{ name: "Mystery" }, ...ROWS];
    const filtered = applyPackFilters(rows, FILTERS, { category: "soup" });
    expect(filtered.map((row) => row.name)).toEqual(["Gazpacho"]);
  });

  it("carries the declared values as valid options on rejection", () => {
    try {
      applyPackFilters(ROWS, FILTERS, { category: "sopu" });
    } catch (error) {
      expect((error as PragmaError).code).toBe("INVALID_INPUT");
      expect((error as PragmaError).validOptions).toContain("soup");
    }
  });

  it("applies several filters conjunctively", () => {
    const filters: StoryPackFilter[] = [
      ...FILTERS,
      { param: "name", variable: "name", values: ["Gazpacho", "Pancakes"] },
    ];
    const rows = applyPackFilters(ROWS, filters, {
      category: "soup",
      name: "Pancakes",
    });
    expect(rows).toEqual([]);
  });
});
