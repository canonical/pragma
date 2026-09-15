/**
 * Regression: asking the same query for another facet list reuses the rows
 * already selected for it.
 *
 * Before the fix, the array source cached its selection and its facets as one
 * entry keyed by the facet list too, so two providers over one source asking
 * for different facets selected and ordered every row again on each delivery.
 * The selection is now cached by the query, and the facets beside it.
 */

import { describe, expect, it } from "vitest";
import createCountedRows from "../../../testing/createCountedRows.js";
import { byId } from "../../../testing/fixtures.js";
import { createCollection } from "../../lib/collection/index.js";
import {
  DEFAULT_WINDOW,
  EMPTY_SLICE,
  type Slice,
} from "../../lib/query/index.js";
import { createArraySource } from "../../lib/source/index.js";

const machines = createCollection({
  identify: byId,
  fields: [
    { field: "name", kind: "text" },
    { field: "status", kind: "choices", options: ["failed", "ready"] },
    { field: "cpu", kind: "number" },
  ],
});

describe("regression 0069 — another facet list selected the rows again", () => {
  it("selects the rows once for one query, whatever facets are asked for", () => {
    const { rows, readCount } = createCountedRows(10, "name");
    const slice: Slice = {
      ...EMPTY_SLICE,
      filter: [{ field: "name", operator: "contains", operands: ["web"] }],
    };
    const source = createArraySource({ rows, collection: machines });
    for (const facets of [["status"], ["cpu"], ["status"]]) {
      source.readDelivery?.({
        requestId: "alternating",
        slice,
        window: DEFAULT_WINDOW,
        facets,
      });
    }
    expect(readCount()).toBe(10);
  });
});
