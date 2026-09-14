import { describe, expect, it } from "vitest";
import placeSortTerm from "./placeSortTerm.js";
import type { SortTerm } from "./types.js";

const buildAscTerm = (field: string): SortTerm => ({ field, direction: "asc" });
const buildDescTerm = (field: string): SortTerm => ({
  field,
  direction: "desc",
});

describe("placeSortTerm", () => {
  it("sets an ordered column's direction where it stands", () => {
    expect(
      placeSortTerm(
        [buildAscTerm("cores"), buildAscTerm("name")],
        "name",
        "desc",
        null,
      ),
    ).toEqual([buildAscTerm("cores"), buildDescTerm("name")]);
    expect(placeSortTerm([buildAscTerm("name")], "name", "asc", 1)).toEqual([
      buildAscTerm("name"),
    ]);
  });

  it("appends an unordered column while the source has room for another term", () => {
    expect(placeSortTerm([buildAscTerm("cores")], "name", "desc", 2)).toEqual([
      buildAscTerm("cores"),
      buildDescTerm("name"),
    ]);
    expect(placeSortTerm([buildAscTerm("cores")], "name", "asc", null)).toEqual(
      [buildAscTerm("cores"), buildAscTerm("name")],
    );
    expect(placeSortTerm([], "name", "asc", 1)).toEqual([buildAscTerm("name")]);
  });

  it("sorts by the column alone once the source has no room left", () => {
    expect(placeSortTerm([buildAscTerm("cores")], "name", "desc", 1)).toEqual([
      buildDescTerm("name"),
    ]);
    expect(
      placeSortTerm(
        [buildAscTerm("cores"), buildAscTerm("status")],
        "name",
        "asc",
        2,
      ),
    ).toEqual([buildAscTerm("name")]);
  });
});
