import { describe, expect, it } from "vitest";
import resolveColumnArrangement from "./resolveColumnArrangement.js";
import type { ArrangedColumn, DeclaredColumn } from "./types.js";

const columns: readonly DeclaredColumn[] = [
  { id: "name", hideable: false },
  { id: "status" },
  { id: "cores" },
  { id: "owner" },
];

const listIds = (arranged: readonly ArrangedColumn[]) =>
  arranged.map(({ column }) => column.id);

describe("resolveColumnArrangement", () => {
  it("places the columns in their declared order, shown, with no width, when nothing is stored", () => {
    expect(resolveColumnArrangement(columns, {})).toEqual(
      columns.map((column) => ({ column, hidden: false, width: null })),
    );
  });

  it("orders by the stored list, ignoring ids that name no column and repeats", () => {
    const arranged = resolveColumnArrangement(columns, {
      "table.order": ["owner", "region", "name", "owner", "cores", "status"],
    });
    expect(listIds(arranged)).toEqual(["owner", "name", "cores", "status"]);
  });

  it("puts a column the list does not name at its declared position", () => {
    // `cores` follows `status` in the declaration, so it follows it here.
    expect(
      listIds(
        resolveColumnArrangement(columns, {
          "table.order": ["owner", "status", "name"],
        }),
      ),
    ).toEqual(["owner", "status", "cores", "name"]);
    // A new first column comes first; one whose predecessors are all
    // unlisted follows the nearest listed one before it.
    expect(
      listIds(resolveColumnArrangement(columns, { "table.order": ["owner"] })),
    ).toEqual(["name", "status", "cores", "owner"]);
    expect(
      listIds(
        resolveColumnArrangement(columns, {
          "table.order": ["status", "owner"],
        }),
      ),
    ).toEqual(["name", "status", "cores", "owner"]);
  });

  it("reads a stored order that is not a list of ids as no order", () => {
    expect(
      listIds(resolveColumnArrangement(columns, { "table.order": "owner" })),
    ).toEqual(["name", "status", "cores", "owner"]);
    expect(
      listIds(resolveColumnArrangement(columns, { "table.order": [1, null] })),
    ).toEqual(["name", "status", "cores", "owner"]);
  });

  it("hides the stored columns, less the ones not declared or not hideable", () => {
    const arranged = resolveColumnArrangement(columns, {
      "table.hidden": ["owner", "name", "region", "cores"],
    });
    expect(arranged.map((column) => column.hidden)).toEqual([
      false,
      false,
      true,
      true,
    ]);
  });

  it("keeps at least one column visible: the first in order", () => {
    const hideable = [{ id: "a" }, { id: "b" }];
    expect(
      resolveColumnArrangement(hideable, {
        "table.hidden": ["a", "b"],
        "table.order": ["b", "a"],
      }).map(({ column, hidden }) => [column.id, hidden]),
    ).toEqual([
      ["b", false],
      ["a", true],
    ]);
    expect(resolveColumnArrangement([], { "table.hidden": [] })).toEqual([]);
  });

  it("carries a usable stored width and nothing else", () => {
    const arranged = resolveColumnArrangement(columns, {
      "table.width.name": 320,
      "table.width.status": -1,
      "table.width.cores": Number.NaN,
      "table.width.owner": "wide",
    });
    expect(arranged.map((column) => column.width)).toEqual([
      320,
      null,
      null,
      null,
    ]);
    // Zero is a width; an unbounded one is none.
    expect(
      resolveColumnArrangement(columns, {
        "table.width.name": 0,
        "table.width.status": Number.POSITIVE_INFINITY,
      })
        .slice(0, 2)
        .map((column) => column.width),
    ).toEqual([0, null]);
  });

  it("counts only declared ids towards hiding every column", () => {
    expect(
      resolveColumnArrangement([{ id: "a" }, { id: "b" }], {
        "table.hidden": ["a", "b", "zzz"],
      }).map((column) => column.hidden),
    ).toEqual([false, true]);
  });
});
