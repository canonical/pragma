import { describe, expect, it } from "vitest";
import applyPackSearch from "./applyPackSearch.js";
import type { StoryPackSearch } from "./types.js";

const ROWS = [
  { name: "Gazpacho", description: "A cold soup" },
  { name: "Pancakes", description: "Fried batter" },
  { name: "Mystery" },
];
const SEARCH: StoryPackSearch = { variables: ["name", "description"] };

describe("applyPackSearch", () => {
  it("returns rows unchanged when no search is declared", () => {
    expect(applyPackSearch(ROWS, undefined, { search: "soup" })).toEqual(ROWS);
  });

  it("returns rows unchanged when no term is provided", () => {
    expect(applyPackSearch(ROWS, SEARCH, {})).toEqual(ROWS);
  });

  it("returns rows unchanged for an empty or whitespace term", () => {
    expect(applyPackSearch(ROWS, SEARCH, { search: "   " })).toEqual(ROWS);
  });

  it("keeps rows where any searched variable contains the term", () => {
    const rows = applyPackSearch(ROWS, SEARCH, { search: "soup" });
    expect(rows.map((row) => row.name)).toEqual(["Gazpacho"]);
  });

  it("matches case-insensitively", () => {
    const rows = applyPackSearch(ROWS, SEARCH, { search: "PANCAKE" });
    expect(rows.map((row) => row.name)).toEqual(["Pancakes"]);
  });

  it("matches substrings mid-value", () => {
    const rows = applyPackSearch(ROWS, SEARCH, { search: "batter" });
    expect(rows.map((row) => row.name)).toEqual(["Pancakes"]);
  });

  it("never matches rows without a binding for a searched variable", () => {
    const rows = applyPackSearch(ROWS, SEARCH, { search: "myst" });
    expect(rows.map((row) => row.name)).toEqual(["Mystery"]);
    expect(applyPackSearch(ROWS, SEARCH, { search: "absent" })).toEqual([]);
  });

  it("matches unicode terms across NFC/NFD normalization forms", () => {
    const rows = [{ name: "Entr\u00e9e" }];
    const search: StoryPackSearch = { variables: ["name"] };
    expect(
      applyPackSearch(rows, search, { search: "entre\u0301e" }),
    ).toHaveLength(1);
  });

  it("ignores non-string search values", () => {
    expect(applyPackSearch(ROWS, SEARCH, { search: 3 })).toEqual(ROWS);
  });
});
