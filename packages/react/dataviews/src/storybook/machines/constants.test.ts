import { describe, expect, it } from "vitest";
import {
  SERVER_BACKED_COLUMNS_CODE,
  SERVER_BACKED_RENDER_CODE,
} from "./constants.js";

describe("SERVER_BACKED_COLUMNS_CODE", () => {
  it("spells the columns the server-backed screen renders", () => {
    expect(
      SERVER_BACKED_COLUMNS_CODE,
    ).toBe(`const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Host", sortable: true },
  { id: "status", header: "Status", sortable: true },
  { id: "cores", header: "Cores", sortable: true },
  { id: "region", header: "Region", sortable: true },
  { id: "owner", header: "Owner", sortable: true },
];`);
  });
});

describe("SERVER_BACKED_RENDER_CODE", () => {
  it("spells the composition the server-backed screen renders", () => {
    expect(SERVER_BACKED_RENDER_CODE).toBe(`<DataViews provider={provider}>
  <DataViews.Search label="Search machines" />
  <DataViews.Filters
    labels={{
      status: "Status",
      cores: "Cores",
    }}
  />
  <DataViews.DataTable
    columns={columns}
    label="Machines"
    rowLabel={(row) => String(row["name"])}
  />
  <DataViews.Pagination sizes={[5, 10]} />
</DataViews>`);
  });
});
