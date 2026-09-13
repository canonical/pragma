/**
 * The current cell, read by a custom cell with the collection as witness:
 * the record channel is typed as the collection's records once the
 * witness matches, and a cell over another collection, or no cell at all,
 * is refused.
 */
import { createCollection } from "@canonical/dataviews-core";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, expectTypeOf, it } from "vitest";
import createFakeChannel from "../../../../../testing/createFakeChannel.js";
import {
  type Machine,
  machine,
  machines,
} from "../../../../../testing/machines.js";
import CellContext from "../CellContext.js";
import type { CellContextValue } from "../types.js";
import useDataViewsCell from "./useDataViewsCell.js";

const alpha = machine("machine-1", "alpha", "failed", 8);

/** The value a table installs for one cell of the machine collection. */
const installCell = (
  overrides: Partial<CellContextValue> = {},
): CellContextValue => ({
  collection: machines,
  rowId: alpha.id,
  columnId: "status",
  record: createFakeChannel<unknown>(alpha),
  fields: { status: createFakeChannel<unknown>(alpha.status) },
  selected: createFakeChannel(false),
  ...overrides,
});

const CellMount = ({
  cell,
  children,
}: {
  cell: CellContextValue;
  children?: ReactNode;
}) => <CellContext value={cell}>{children}</CellContext>;

/** Another collection, over which the cell's table was not built. */
const racks = createCollection({
  identify: (rack: { readonly id: string }) => rack.id,
  fields: [{ field: "status", kind: "choices", options: ["failed"] }],
});

describe("useDataViewsCell", () => {
  it("reads the installed cell for the witnessed collection", () => {
    const cell = installCell();
    const { result } = renderHook(() => useDataViewsCell(machines), {
      wrapper: ({ children }) => <CellMount cell={cell}>{children}</CellMount>,
    });
    expect(result.current.rowId).toBe("machine-1");
    expect(result.current.columnId).toBe("status");
    expect(result.current.record.get()).toEqual(alpha);
    expect(result.current.fields["status"]?.get()).toBe("failed");
    expect(result.current.selected.get()).toBe(false);
    // The record is the collection's, with no cast at the call site.
    expectTypeOf(result.current.record.get()).toEqualTypeOf<Machine>();
    expect(result.current.record.get().cores).toBe(8);
  });

  it("serves the same scope while the installed cell stands", () => {
    const cell = installCell();
    const { result, rerender } = renderHook(() => useDataViewsCell(machines), {
      wrapper: ({ children }) => <CellMount cell={cell}>{children}</CellMount>,
    });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it("throws outside an installed cell", () => {
    expect(() => renderHook(() => useDataViewsCell(machines))).toThrow(
      "useDataViewsCell must be used inside a cell rendered by a DataViews table",
    );
  });

  it("throws on a witness mismatch", () => {
    const cell = installCell();
    expect(() =>
      renderHook(() => useDataViewsCell(racks), {
        wrapper: ({ children }) => (
          <CellMount cell={cell}>{children}</CellMount>
        ),
      }),
    ).toThrow(
      "useDataViewsCell was passed a collection that is not the one the enclosing table's provider was built over",
    );
  });
});
