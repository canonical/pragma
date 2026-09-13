/**
 * The connected table: the DataTable, bound to the enclosing root's
 * provider. The table's own behaviour is pinned beside it; this pins the
 * binding, which is the whole of the part.
 */
import {
  createDataViewsProvider,
  createSchema,
  type DataViewsProvider,
} from "@canonical/dataviews-core";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DataTableColumn } from "../../../DataTable/index.js";
import DataViews from "../../Provider.js";
import DataTable from "./DataTable.js";

const schema = createSchema([
  { field: "status", kind: "choices", options: ["failed", "ready"] },
]);

type Fields = typeof schema.fields;
type Machine = { readonly id: string; readonly name: string };

const columns: readonly DataTableColumn[] = [{ id: "name", header: "Name" }];

const makeProvider = (): DataViewsProvider<Fields, Machine> =>
  createDataViewsProvider<Fields, Machine>({ schema });

describe("DataViews.DataTable", () => {
  it("is reachable as the composition's DataTable part", () => {
    expect(DataViews.DataTable).toBe(DataTable);
  });

  it("fails clearly outside a DataViews root", () => {
    expect(() =>
      render(<DataTable columns={columns} label="Machines" />),
    ).toThrow("DataViews.DataTable must be used inside a DataViews root");
  });

  it("renders the root's rows and takes the table's props, less the provider", () => {
    const provider = makeProvider();
    render(
      <DataViews provider={provider}>
        <DataTable columns={columns} label="Machines" className="rows" />
      </DataViews>,
    );
    const requestId = provider.refresh();
    if (requestId === null) {
      throw new Error("expected a refresh request");
    }
    const counted = { kind: "exact", value: 1 } as const;
    act(() => {
      provider.complete(requestId, {
        status: "succeeded",
        page: {
          rows: [{ id: "m1", name: "alpha" }],
          groups: null,
          counts: { pageable: counted, matched: counted, total: counted },
          more: null,
          cursors: null,
        },
      });
    });
    const table = screen.getByRole("table", { name: "Machines" });
    expect(table).toHaveClass("ds", "data-table", "rows");
    expect(screen.getByRole("cell", { name: "alpha" })).toBeInTheDocument();
  });
});
