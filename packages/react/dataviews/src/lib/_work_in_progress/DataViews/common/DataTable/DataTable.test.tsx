/**
 * The connected table: the DataTable, bound to the enclosing root's
 * provider. The table's own behaviour is pinned beside it; this pins the
 * binding, which is the whole of the part.
 */
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { pageOf } from "../../../../../../testing/fixtures.js";
import {
  createMachineProvider,
  machine,
} from "../../../../../../testing/machines.js";
import type { DataTableColumn } from "../../../DataTable/index.js";
import DataViews from "../../Provider.js";
import DataTable from "./DataTable.js";

const columns: readonly DataTableColumn[] = [{ id: "name", header: "Name" }];

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
    const { provider, source } = createMachineProvider();
    render(
      <DataViews provider={provider}>
        <DataTable columns={columns} label="Machines" className="rows" />
      </DataViews>,
    );
    // The root observed the provider, which asked the source for its page.
    expect(source.calls).toHaveLength(1);
    act(() => {
      source.latest().deliver({
        status: "succeeded",
        page: pageOf([machine("m1", "alpha")]),
      });
    });
    const table = screen.getByRole("table", { name: "Machines" });
    expect(table).toHaveClass("ds", "data-table", "rows");
    expect(screen.getByRole("cell", { name: "alpha" })).toBeInTheDocument();
  });

  it("shows a source's synchronous answer on the render after its effect", () => {
    const { provider, source } = createMachineProvider({
      rows: [machine("m1", "alpha"), machine("m2", "beta")],
    });
    render(
      <DataViews provider={provider}>
        <DataTable columns={columns} label="Machines" />
      </DataViews>,
    );
    expect(screen.getByRole("cell", { name: "alpha" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "beta" })).toBeInTheDocument();
    // The table inside the root observes too; the ref-count keeps it to one run.
    expect(source.calls).toHaveLength(1);
  });
});
