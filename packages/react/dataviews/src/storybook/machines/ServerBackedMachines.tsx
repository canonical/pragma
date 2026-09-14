import type { QueryLocation, Source } from "@canonical/dataviews-core";
import type { ReactElement } from "react";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";
import { SERVER_BACKED_COLUMNS, SERVER_BACKED_PARTS } from "./constants.js";
import type { Machine } from "./fixtures.js";
import { useMachineProvider } from "./story-utils.js";

/** How one server-backed screen is set up. Read once, when it mounts. */
type ServerBackedMachinesProps = {
  /** The source reaching the endpoint, built once for the screen. */
  readonly source: () => Source<Machine>;
  /** Where the applied query lives; in the provider alone by default. */
  readonly location?: QueryLocation | undefined;
};

/**
 * The screen the server-backed stories render: search, filters, the sortable
 * table and its pagination over one provider whose source reaches a mock
 * endpoint. The page holds five machines, so paging reaches the endpoint
 * too. Story-only.
 */
export default function ServerBackedMachines({
  source,
  location,
}: ServerBackedMachinesProps): ReactElement {
  const provider = useMachineProvider({
    source,
    query: "page=1&size=5",
    location,
  });
  return (
    <DataViews provider={provider}>
      <DataViews.Search label={SERVER_BACKED_PARTS.searchLabel} />
      <DataViews.Filters labels={SERVER_BACKED_PARTS.labels} />
      <DataViews.DataTable
        columns={SERVER_BACKED_COLUMNS}
        label={SERVER_BACKED_PARTS.tableLabel}
        rowLabel={(row) => String(row["name"])}
      />
      <DataViews.Pagination sizes={SERVER_BACKED_PARTS.sizes} />
    </DataViews>
  );
}
