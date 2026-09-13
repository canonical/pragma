import type {
  RowRecord,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import type { DataTableProps } from "../../../DataTable/index.js";

/**
 * Props of the connected table: the table's own, less the provider, which
 * comes from the enclosing root.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type DataViewsDataTableProps<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = Omit<DataTableProps<TFields, TRow>, "provider">;
