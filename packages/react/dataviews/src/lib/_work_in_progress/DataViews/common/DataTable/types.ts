import type { SchemaFieldDefinition } from "@canonical/dataviews-core";
import type { DataTableProps } from "../../../DataTable/index.js";

/**
 * Props of the connected table: the table's own, less the provider, which
 * comes from the enclosing root. The records are the widest shape, since
 * the root's provider may have been built over any collection; a custom
 * cell narrows them through `useDataViewsCell(collection)`.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type DataViewsDataTableProps = Omit<
  DataTableProps<readonly SchemaFieldDefinition[]>,
  "provider"
>;
