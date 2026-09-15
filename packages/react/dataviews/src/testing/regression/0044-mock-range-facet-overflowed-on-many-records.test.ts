/**
 * Regression: the mock endpoints bound a range facet over any number of
 * records.
 *
 * Before the fix, the least and greatest cores were found by spreading every
 * value into Math.min and Math.max, which overflows the call stack once the
 * values number in the hundreds of thousands: the recipe a reader copies
 * failed on a real inventory. The values are now folded one at a time.
 */

import { describe, expect, it } from "vitest";
import {
  type ApiQuery,
  type ApiRecord,
  readApiFacets,
} from "../../storybook/machines/api/index.js";

const RECORD_COUNT = 200_000;

const query: ApiQuery = {
  text: [],
  statuses: { isAny: [], isNone: [] },
  cores: { gte: null, lte: null },
  search: null,
  facets: ["cores"],
  sort: null,
};

describe("regression 0044 — mock range facet overflowed on many records", () => {
  it("bounds the cores of two hundred thousand records", () => {
    // Built within the case, so a run that filters it out pays nothing.
    const records: readonly ApiRecord[] = Array.from(
      { length: RECORD_COUNT },
      (_unused, at) => ({ id: `m${at}`, cores: at }),
    );
    expect(readApiFacets(records, query, records, () => () => true)).toEqual({
      cores: { kind: "range", min: 0, max: RECORD_COUNT - 1 },
    });
  });
});
