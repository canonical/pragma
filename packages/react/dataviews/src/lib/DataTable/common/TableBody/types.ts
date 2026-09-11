import type {
  DataViewsProvider,
  DisplayEntry,
  RowScopes,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import type { ReactNode } from "react";
import type { DataTableColumn, DataTableStatus } from "../../types.js";

/**
 * Props of the table's body row group, windowed or not.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * deriving its root from the table's entries, not forwarding a caller's
 * native props.
 */
export type TableBodyProps<TRow extends object> = {
  readonly provider: DataViewsProvider<readonly SchemaFieldDefinition[], TRow>;
  readonly scopes: RowScopes<TRow>;
  /**
   * What the body displays, in order: the status row when there is a
   * status — why there are no rows, or why the rows shown are an earlier
   * query's — then the rows, unless the status replaces them.
   */
  readonly entries: readonly DisplayEntry<DataTableStatus>[];
  readonly columns: readonly DataTableColumn[];
  readonly fields: readonly string[];
  readonly selectable: boolean;
  readonly rowLabel: (row: TRow, rowId: string) => string;
  readonly renderStatus: (status: DataTableStatus) => ReactNode;
};
