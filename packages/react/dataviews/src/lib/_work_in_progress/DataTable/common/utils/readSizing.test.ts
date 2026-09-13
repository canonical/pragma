/** A column names its sizing, or takes the default. */
import { describe, expect, it } from "vitest";
import type { DataTableColumn } from "../../types.js";
import readSizing from "./readSizing.js";

const name: DataTableColumn = { id: "name", header: "Name" };

describe("readSizing", () => {
  it("defaults a column that declares no sizing", () => {
    expect(readSizing(name)).toEqual({ kind: "flex", weight: 1, minPx: 96 });
    expect(readSizing({ ...name, sizing: { kind: "fixed", px: 40 } })).toEqual({
      kind: "fixed",
      px: 40,
    });
  });
});
