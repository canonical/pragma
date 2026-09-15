/**
 * Regression: moving a column in one table reordered the columns of another
 * table over the same presentation.
 *
 * Before the fix, the order a move wrote put every column the moving table
 * declares first and the stored ids of other columns after, so a second
 * table whose columns the first does not share saw its own order change
 * though nothing moved in it. A move now keeps every stored id in its place
 * and fills the moving table's places in its new order.
 */

import { describe, expect, it } from "vitest";
import {
  moveColumn,
  resolveColumnArrangement,
} from "../../lib/presentation/index.js";

describe("regression 0077 — moving a column reordered another table's columns", () => {
  it("leaves another table's order as it was", () => {
    const stored = { "table.order": ["cores", "status"] };
    const patch = moveColumn({
      columns: [{ id: "name" }, { id: "status" }],
      presentation: stored,
      id: "name",
      offset: 1,
    });
    expect(patch).toEqual({ "table.order": ["cores", "status", "name"] });
    const other = [{ id: "status" }, { id: "cores" }];
    expect(
      resolveColumnArrangement(other, { ...stored, ...patch }).map(
        ({ column }) => column.id,
      ),
    ).toEqual(
      resolveColumnArrangement(other, stored).map(({ column }) => column.id),
    );
  });
});
