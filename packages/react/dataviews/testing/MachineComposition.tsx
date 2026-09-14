import type { ReactElement } from "react";
import type { DataTableColumn } from "../src/lib/_work_in_progress/DataTable/index.js";
import { DataViews } from "../src/lib/_work_in_progress/DataViews/index.js";
import type { MachineProvider } from "./machines.js";

/** The table's columns: cores alone sort, so one header claims an ordering. */
const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Name" },
  { id: "status", header: "Status" },
  { id: "cores", header: "Cores", sortable: true },
];

/**
 * The connected composition a server renders and a client hydrates: the
 * search, the filters, the machines' table and the pagination bar, over one
 * provider.
 */
export default function MachineComposition({
  provider,
}: {
  readonly provider: MachineProvider;
}): ReactElement {
  return (
    <DataViews provider={provider}>
      <DataViews.Search label="Search machines" />
      <DataViews.Filters />
      <DataViews.DataTable columns={columns} label="Machines" />
      <DataViews.Pagination sizes={[25, 50, 100]} />
    </DataViews>
  );
}
