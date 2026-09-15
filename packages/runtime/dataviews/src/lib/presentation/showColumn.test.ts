import { describe, expect, it } from "vitest";
import showColumn from "./showColumn.js";
import type { DeclaredColumn } from "./types.js";

const columns: readonly DeclaredColumn[] = [
  { id: "name" },
  { id: "status" },
  { id: "cores" },
];

describe("showColumn", () => {
  it("takes the column out of the hidden list, keeping every other id", () => {
    expect(
      showColumn({
        columns,
        presentation: { "table.hidden": ["region", "status", "status"] },
        id: "status",
      }),
    ).toEqual({ "table.hidden": ["region"] });
  });

  it("drops a column the list kept shown by naming every column, and keeps an unhideable one's id", () => {
    // Every column named: the first is shown anyway, so it leaves the list.
    expect(
      showColumn({
        columns,
        presentation: { "table.hidden": ["name", "status", "cores"] },
        id: "cores",
      }),
    ).toEqual({ "table.hidden": ["status"] });
    // An unhideable column is shown whatever the list says: its id stays, for
    // a table that declares it hideable.
    expect(
      showColumn({
        columns: [{ id: "name", hideable: false }, { id: "status" }],
        presentation: { "table.hidden": ["name", "status"] },
        id: "status",
      }),
    ).toEqual({ "table.hidden": ["name"] });
  });

  it("changes nothing for an unknown or shown column", () => {
    const presentation = { "table.hidden": ["status"] };
    expect(showColumn({ columns, presentation, id: "region" })).toBeNull();
    expect(showColumn({ columns, presentation, id: "cores" })).toBeNull();
  });
});
