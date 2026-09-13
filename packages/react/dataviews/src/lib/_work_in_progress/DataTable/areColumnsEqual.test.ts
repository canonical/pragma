/** The rendered reading carries what the model reading deliberately does not. */
import { describe, expect, it } from "vitest";
import areColumnsEqual from "./areColumnsEqual.js";
import type { DataTableColumn } from "./types.js";

const name: DataTableColumn = { id: "name", header: "Name" };

describe("areColumnsEqual", () => {
  it("carries the model", () => {
    expect(areColumnsEqual([name], [{ ...name, id: "machine" }])).toBe(false);
  });

  it("sees sorting and resizing offered or withdrawn", () => {
    expect(areColumnsEqual([name], [{ ...name, sortable: true }])).toBe(false);
    expect(areColumnsEqual([name], [{ ...name, resizable: true }])).toBe(false);
  });

  it("compares the header and the renderer by reference", () => {
    const cell = () => null;
    expect(areColumnsEqual([name], [{ ...name }])).toBe(true);
    expect(areColumnsEqual([name], [{ ...name, header: "Machine" }])).toBe(
      false,
    );
    expect(areColumnsEqual([{ ...name, cell }], [{ ...name, cell }])).toBe(
      true,
    );
    expect(
      areColumnsEqual([{ ...name, cell }], [{ ...name, cell: () => null }]),
    ).toBe(false);
  });
});
