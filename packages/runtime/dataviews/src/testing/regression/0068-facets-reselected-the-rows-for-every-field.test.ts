/**
 * Regression: a facet over a field the query does not restrict reads the rows
 * the query already selected.
 *
 * Before the fix, the array source selected every row again for each facet
 * field — once for the page, and once more per field — though lifting a
 * field the query does not restrict lifts nothing. With text filters applied
 * as they are typed, every keystroke paid a full pass per facet. Only a
 * restricted field now costs a pass of its own.
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

describe("regression 0068 — facets reselected the rows for every field", () => {
  it("selects once for the page and once more per restricted facet field only", () => {
    const { rows, readCount } = createCountedRows(10, "name");
    const slice: Slice = {
      ...EMPTY_SLICE,
      filter: [
        { field: "name", operator: "contains", operands: ["web"] },
        { field: "status", operator: "isAny", operands: ["failed"] },
      ],
    };
    createArraySource({ rows, collection: machines }).readDelivery?.({
      requestId: "typed",
      slice,
      window: DEFAULT_WINDOW,
      facets: ["status", "cpu"],
    });
    // The page's pass reads every name; the status facet lifts status and
    // reads every name again; the cpu facet reuses the page's selection.
    expect(readCount()).toBe(20);
  });
});
