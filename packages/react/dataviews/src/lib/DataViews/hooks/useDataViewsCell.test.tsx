import type { DataViewsProvider } from "@canonical/dataviews-core";
import {
  createDataViewsProvider,
  createSchema,
} from "@canonical/dataviews-core";
import { createChannel } from "@canonical/dataviews-core/bindings";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import type { CellScopeValue } from "../CellScopeContext.js";
import CellScopeContext from "../CellScopeContext.js";
import useDataViewsCell from "./useDataViewsCell.js";

const machinesSchema = () =>
  createSchema([{ field: "status", kind: "choices", options: ["failed"] }]);

const machinesProvider = () =>
  createDataViewsProvider({ schema: machinesSchema() });

const installCell = (
  provider: DataViewsProvider<ReturnType<typeof machinesSchema>["fields"]>,
  overrides: Partial<CellScopeValue> = {},
): CellScopeValue => ({
  provider,
  rowId: "machine-1",
  columnId: "status",
  row: createChannel<unknown>({ id: "machine-1", status: "failed" }),
  fields: { status: createChannel<unknown>("failed") },
  selected: createChannel(false),
  ...overrides,
});

const CellMount = ({
  scope,
  children,
}: {
  scope: CellScopeValue;
  children?: ReactNode;
}) => (
  <CellScopeContext.Provider value={scope}>
    {children}
  </CellScopeContext.Provider>
);

describe("useDataViewsCell", () => {
  it("reads the installed cell scope for the witnessed provider", () => {
    const p = machinesProvider();
    const scope = installCell(p);
    const { result } = renderHook(() => useDataViewsCell(p), {
      wrapper: ({ children }) => (
        <CellMount scope={scope}>{children}</CellMount>
      ),
    });
    expect(result.current.rowId).toBe("machine-1");
    expect(result.current.columnId).toBe("status");
    expect(result.current.row.get()).toEqual({
      id: "machine-1",
      status: "failed",
    });
    expect(result.current.fields.status?.get()).toBe("failed");
    expect(result.current.selected.get()).toBe(false);
  });

  it("throws outside an installed cell scope", () => {
    const p = machinesProvider();
    expect(() => renderHook(() => useDataViewsCell(p))).toThrow(
      "inside a cell rendered by a DataViews table",
    );
  });

  it("throws on a witness mismatch", () => {
    const p = machinesProvider();
    const other = machinesProvider();
    const scope = installCell(p);
    expect(() =>
      renderHook(() => useDataViewsCell(other), {
        wrapper: ({ children }) => (
          <CellMount scope={scope}>{children}</CellMount>
        ),
      }),
    ).toThrow("not the enclosing cell's provider");
  });

  it("throws on a forged provider before reading context", () => {
    expect(() =>
      renderHook(() =>
        useDataViewsCell(
          {} as DataViewsProvider<ReturnType<typeof machinesSchema>["fields"]>,
        ),
      ),
    ).toThrow("createDataViewsProvider");
  });
});
