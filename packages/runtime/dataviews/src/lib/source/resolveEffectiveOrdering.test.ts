import { describe, expect, it } from "vitest";
import { declareSort } from "../../../testing/fixtures.js";
import { EMPTY_SLICE, type Slice } from "../query/index.js";
import resolveEffectiveOrdering from "./resolveEffectiveOrdering.js";
import type { SortCapabilities } from "./types.js";

const buildSlice = (overrides: Partial<Slice> = {}): Slice => ({
  ...EMPTY_SLICE,
  ...overrides,
});

const declareOrdering = (
  overrides: Partial<SortCapabilities> = {},
): SortCapabilities => ({
  ...declareSort(["name", "status", "cores"]),
  ...overrides,
});

describe("resolveEffectiveOrdering", () => {
  it("takes the query's own terms, in the order they were given", () => {
    const terms = [
      { field: "status", direction: "asc" },
      { field: "name", direction: "desc" },
    ] as const;
    expect(
      resolveEffectiveOrdering(buildSlice({ sort: terms }), declareOrdering()),
    ).toEqual({
      terms,
      tiebreak: "opaque",
    });
  });

  it("takes the source's default when the query states no term", () => {
    const order = [{ field: "name", direction: "asc" }] as const;
    expect(
      resolveEffectiveOrdering(
        EMPTY_SLICE,
        declareOrdering({ default: order }),
      ),
    ).toEqual({ terms: order, tiebreak: "opaque" });
  });

  it("is empty when neither the query nor the source orders", () => {
    expect(resolveEffectiveOrdering(EMPTY_SLICE, declareOrdering())).toEqual({
      terms: [],
      tiebreak: "opaque",
    });
  });

  it("carries the source's tiebreak without putting it among the terms", () => {
    const tiebreak = [{ field: "cores", direction: "asc" }] as const;
    expect(
      resolveEffectiveOrdering(EMPTY_SLICE, declareOrdering({ tiebreak })),
    ).toEqual({
      terms: [],
      tiebreak,
    });
  });

  it("collapses a field spelled twice to its first occurrence", () => {
    expect(
      resolveEffectiveOrdering(
        buildSlice({
          sort: [
            { field: "name", direction: "asc" },
            { field: "name", direction: "desc" },
          ],
        }),
        declareOrdering(),
      ).terms,
    ).toEqual([{ field: "name", direction: "asc" }]);
  });

  it("orders the group levels first, ascending unless the query says otherwise", () => {
    expect(
      resolveEffectiveOrdering(
        buildSlice({
          group: [{ field: "status" }],
          sort: [{ field: "name", direction: "desc" }],
        }),
        declareOrdering(),
      ).terms,
    ).toEqual([
      { field: "status", direction: "asc" },
      { field: "name", direction: "desc" },
    ]);
  });

  it("takes a group level's direction from the query's own term on it", () => {
    expect(
      resolveEffectiveOrdering(
        buildSlice({
          group: [{ field: "status" }],
          sort: [
            { field: "name", direction: "asc" },
            { field: "status", direction: "desc" },
          ],
        }),
        declareOrdering(),
      ).terms,
    ).toEqual([
      { field: "status", direction: "desc" },
      { field: "name", direction: "asc" },
    ]);
  });
});
