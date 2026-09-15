/**
 * Regression: the range a date facet offers is one a date bound reaches.
 *
 * Before the fix, the facet ordered every value it could read as an instant —
 * a `Date`, epoch milliseconds, an instant string — and reported the extremes
 * as it found them, while a date bound compares a record's text with the
 * calendar date given, by code unit. The facet offered a greatest value held
 * by a `Date`, which no bound selects: entering it dropped the record it came
 * from. The facet now ranges over the text values, compared as a bound
 * compares them.
 */

import { describe, expect, it } from "vitest";
import { byId, declareSort } from "../../../testing/fixtures.js";
import { createCollection } from "../../lib/collection/index.js";
import { EMPTY_SLICE } from "../../lib/query/index.js";
import { executeSlice, readFacets } from "../../lib/source/index.js";

const machines = createCollection({
  identify: byId,
  fields: [{ field: "updated", kind: "date" }],
});

const rows = [
  { id: "early", updated: "2026-01-01" },
  { id: "late", updated: "2026-02-01" },
  { id: "as-date", updated: new Date("2026-03-01T00:00:00Z") },
  { id: "as-epoch", updated: 1_780_000_000_000 },
];

describe("regression 0066 — date facet offered bounds no filter reaches", () => {
  it("offers a greatest date that a bound at it keeps", () => {
    const { schema } = machines;
    const facet = readFacets(
      rows,
      EMPTY_SLICE,
      schema.fields,
      { schema },
      rows,
    )["updated"];
    if (facet?.kind !== "range" || typeof facet.max !== "string") {
      throw new Error("expected a range of text");
    }
    const kept = executeSlice(
      rows,
      {
        ...EMPTY_SLICE,
        filter: [{ field: "updated", operator: "lte", operands: [facet.max] }],
      },
      { schema, sort: declareSort(schema.fieldNames) },
    ).map((row) => row.id);
    expect(facet).toEqual({
      kind: "range",
      min: "2026-01-01",
      max: "2026-02-01",
    });
    expect(kept).toContain("late");
  });
});
