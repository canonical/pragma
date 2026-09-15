import { describe, expect, it } from "vitest";
import moveColumn from "./moveColumn.js";
import resolveColumnArrangement from "./resolveColumnArrangement.js";
import type { DeclaredColumn } from "./types.js";

const columns: readonly DeclaredColumn[] = [
  { id: "name" },
  { id: "status" },
  { id: "cores" },
  { id: "owner" },
];

describe("moveColumn", () => {
  it("moves a column past its neighbour either way, naming every declared column", () => {
    expect(
      moveColumn({ columns, presentation: {}, id: "cores", offset: -1 }),
    ).toEqual({ "table.order": ["name", "cores", "status", "owner"] });
    expect(
      moveColumn({ columns, presentation: {}, id: "status", offset: 1 }),
    ).toEqual({ "table.order": ["name", "cores", "status", "owner"] });
  });

  it("steps over hidden columns, which keep their places", () => {
    const presentation = { "table.hidden": ["status", "cores"] };
    const patch = moveColumn({
      columns,
      presentation,
      id: "owner",
      offset: -1,
    });
    expect(patch).toEqual({
      "table.order": ["owner", "name", "status", "cores"],
    });
    expect(
      resolveColumnArrangement(columns, { ...presentation, ...patch })
        .filter(({ hidden }) => !hidden)
        .map(({ column }) => column.id),
    ).toEqual(["owner", "name"]);
  });

  it("moves right across hidden columns to after the next shown one", () => {
    expect(
      moveColumn({
        columns,
        presentation: { "table.hidden": ["status", "cores"] },
        id: "name",
        offset: 1,
      }),
    ).toEqual({ "table.order": ["status", "cores", "owner", "name"] });
  });

  it("writes no junk or repeated id from a stored order, keeping another table's id in its place", () => {
    expect(
      moveColumn({
        columns,
        presentation: { "table.order": ["name", 3, "name", "region"] },
        id: "status",
        offset: -1,
      }),
    ).toEqual({
      "table.order": ["status", "region", "name", "cores", "owner"],
    });
  });

  it("keeps the ids of columns it does not declare where they stood", () => {
    expect(
      moveColumn({
        columns,
        presentation: { "table.order": ["region", "owner", "zone", "name"] },
        id: "name",
        offset: 1,
      }),
    ).toEqual({
      "table.order": ["region", "owner", "zone", "status", "name", "cores"],
    });
  });

  it("changes nothing past either end, for a hidden column or an unknown one", () => {
    const presentation = { "table.hidden": ["cores"] };
    expect(
      moveColumn({ columns, presentation, id: "name", offset: -1 }),
    ).toBeNull();
    expect(
      moveColumn({ columns, presentation, id: "owner", offset: 1 }),
    ).toBeNull();
    expect(
      moveColumn({ columns, presentation, id: "cores", offset: 1 }),
    ).toBeNull();
    expect(
      moveColumn({ columns, presentation, id: "region", offset: -1 }),
    ).toBeNull();
  });
});
