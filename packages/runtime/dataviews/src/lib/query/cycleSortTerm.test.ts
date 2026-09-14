import { describe, expect, it } from "vitest";
import cycleSortTerm from "./cycleSortTerm.js";
import type { SortTerm } from "./types.js";

const buildAscTerm = (field: string): SortTerm => ({ field, direction: "asc" });
const buildDescTerm = (field: string): SortTerm => ({
  field,
  direction: "desc",
});

describe("cycleSortTerm", () => {
  describe("a plain activation", () => {
    it("sorts by an unordered column ascending first", () => {
      expect(cycleSortTerm([], "name", false)).toEqual([buildAscTerm("name")]);
    });

    it("turns ascending into descending, then back to the default", () => {
      expect(cycleSortTerm([buildAscTerm("name")], "name", false)).toEqual([
        buildDescTerm("name"),
      ]);
      expect(cycleSortTerm([buildDescTerm("name")], "name", false)).toEqual([]);
    });

    it("replaces every other term with the activated column's", () => {
      expect(
        cycleSortTerm(
          [buildAscTerm("cores"), buildAscTerm("name")],
          "status",
          false,
        ),
      ).toEqual([buildAscTerm("status")]);
      expect(
        cycleSortTerm(
          [buildAscTerm("cores"), buildAscTerm("name")],
          "name",
          false,
        ),
      ).toEqual([buildDescTerm("name")]);
    });
  });

  describe("an additive activation", () => {
    it("appends an unordered column ascending after every term", () => {
      expect(cycleSortTerm([buildDescTerm("cores")], "name", true)).toEqual([
        buildDescTerm("cores"),
        buildAscTerm("name"),
      ]);
      expect(cycleSortTerm([], "name", true)).toEqual([buildAscTerm("name")]);
    });

    it("turns an ascending term descending where it stands", () => {
      expect(
        cycleSortTerm(
          [buildAscTerm("cores"), buildAscTerm("name"), buildAscTerm("status")],
          "name",
          true,
        ),
      ).toEqual([
        buildAscTerm("cores"),
        buildDescTerm("name"),
        buildAscTerm("status"),
      ]);
    });

    it("removes a descending term, promoting the terms after it", () => {
      expect(
        cycleSortTerm(
          [
            buildAscTerm("cores"),
            buildDescTerm("name"),
            buildAscTerm("status"),
          ],
          "name",
          true,
        ),
      ).toEqual([buildAscTerm("cores"), buildAscTerm("status")]);
    });
  });

  it("never changes the ordering it was given", () => {
    const sort = Object.freeze([buildAscTerm("cores"), buildAscTerm("name")]);
    cycleSortTerm(sort, "name", true);
    cycleSortTerm(sort, "status", true);
    expect(sort).toEqual([buildAscTerm("cores"), buildAscTerm("name")]);
  });
});
