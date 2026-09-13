import type {
  DataViewsProvider,
  RowRecord,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import type { ReactElement } from "react";
import { DataTable as Table } from "../../../DataTable/index.js";
import { useDataViewsRoot } from "../../hooks/index.js";
import type { DataViewsDataTableProps } from "./types.js";

/**
 * The collection's rows: the DataTable, bound to the enclosing root's
 * provider.
 *
 * It renders exactly what `DataTable` renders for that provider. The one
 * difference is where the provider comes from: this part reads the root it
 * is placed in, and throws outside one, rather than taking a provider prop.
 *
 * `import { DataViews } from "@canonical/dataviews-react";`
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function DataTable<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
>(props: DataViewsDataTableProps<TFields, TRow>): ReactElement {
  const provider = useDataViewsRoot("DataTable");
  // The context holds the widest provider shape, whatever schema and record
  // type the root was given; narrowing it back here is the inverse of the
  // widening the root did, and the table's own identity check is what makes
  // the provider genuine at runtime.
  const typed = provider as unknown as DataViewsProvider<TFields, TRow>;
  return <Table {...props} provider={typed} />;
}
