/**
 * Regression: ordering a query differently reuses the facets computed for it.
 *
 * Before the fix, the array source cached its facets by the slice itself, so
 * a new order over the same filter and search — a header activated — read
 * every facet again over every record, though no facet depends on the order.
 * The facets are now cached by what the slice selects.
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
    { field: "status", kind: "choices", options: ["failed", "ready"] },
    { field: "cpu", kind: "number" },
  ],
});

const restricted: Slice = {
  ...EMPTY_SLICE,
  filter: [{ field: "status", operator: "isAny", operands: ["failed"] }],
};

const reordered: Slice = {
  ...restricted,
  sort: [{ field: "cpu", direction: "desc" }],
};

describe("regression 0074 — a new ordering read every facet again", () => {
  it("reads no facet again when only the order moves", () => {
    // What selecting and ordering the reordered query reads, asking no facet.
    const bare = createCountedRows(10, "status");
    createArraySource({
      rows: bare.rows,
      collection: machines,
    }).readDelivery?.({
      requestId: "bare",
      slice: reordered,
      window: DEFAULT_WINDOW,
      facets: [],
    });

    const { rows, readCount } = createCountedRows(10, "status");
    const source = createArraySource({ rows, collection: machines });
    source.readDelivery?.({
      requestId: "first",
      slice: restricted,
      window: DEFAULT_WINDOW,
      facets: ["status"],
    });
    const before = readCount();
    const delivery = source.readDelivery?.({
      requestId: "reordered",
      slice: reordered,
      window: DEFAULT_WINDOW,
      facets: ["status"],
    });
    expect(readCount() - before).toBe(bare.readCount());
    expect(
      delivery?.status === "succeeded" ? delivery.page.facets : null,
    ).toEqual({
      status: {
        kind: "values",
        values: [
          { value: "failed", count: { kind: "exact", value: 5 } },
          { value: "ready", count: { kind: "exact", value: 5 } },
        ],
      },
    });
  });
});
