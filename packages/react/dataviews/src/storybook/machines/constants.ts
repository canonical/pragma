/**
 * What the server-backed stories share: the columns their screen renders,
 * the names and page sizes of its parts, and the source text of those
 * columns and of the composition, for their "Show code" panels. The text is
 * written from the columns and parts it spells. Each stories file adds the
 * source its endpoint is reached through.
 */

import type { DataTableColumn } from "../../lib/_work_in_progress/DataTable/index.js";

/** The machine columns, each ordered by the header where the source can. */
export const SERVER_BACKED_COLUMNS = [
  { id: "name", header: "Host", sortable: true },
  { id: "status", header: "Status", sortable: true },
  { id: "cores", header: "Cores", sortable: true },
  { id: "region", header: "Region", sortable: true },
  { id: "owner", header: "Owner", sortable: true },
] as const satisfies readonly DataTableColumn[];

/** The machine columns, as source text written from the columns themselves. */
export const SERVER_BACKED_COLUMNS_CODE = `const columns: readonly DataTableColumn[] = [
${SERVER_BACKED_COLUMNS.map(
  ({ id, header, sortable }) =>
    `  { id: ${JSON.stringify(id)}, header: ${JSON.stringify(header)}, sortable: ${String(sortable)} },`,
).join("\n")}
];`;

/**
 * What the screen names its parts and fields, and the page sizes it offers:
 * read by the screen and by the source text of its composition alike.
 */
export const SERVER_BACKED_PARTS = {
  searchLabel: "Search machines",
  tableLabel: "Machines",
  labels: {
    status: "Status",
    cores: "Cores",
  },
  sizes: [5, 10],
} as const satisfies {
  readonly searchLabel: string;
  readonly tableLabel: string;
  readonly labels: Readonly<Record<string, string>>;
  readonly sizes: readonly number[];
};

/**
 * The composition every server-backed story renders, as JSX source text
 * written from the parts it names.
 */
export const SERVER_BACKED_RENDER_CODE = `<DataViews provider={provider}>
  <DataViews.Search label=${JSON.stringify(SERVER_BACKED_PARTS.searchLabel)} />
  <DataViews.Filters
    labels={{
${Object.entries(SERVER_BACKED_PARTS.labels)
  .map(([field, label]) => `      ${field}: ${JSON.stringify(label)},`)
  .join("\n")}
    }}
  />
  <DataViews.DataTable
    columns={columns}
    label=${JSON.stringify(SERVER_BACKED_PARTS.tableLabel)}
    rowLabel={(row) => String(row["name"])}
  />
  <DataViews.Pagination sizes={[${SERVER_BACKED_PARTS.sizes.join(", ")}]} />
</DataViews>`;
