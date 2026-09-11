import type {
  DataViewsProvider,
  RowScopes,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import type { ReactNode } from "react";
import type { DataTableColumn, DataTableStatus } from "../../types.js";

/**
 * Props of the table's body row group.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * deriving its root from the row-scope registry, not forwarding a caller's
 * native props.
 */
export type TableBodyProps<TRow extends object> = {
  readonly provider: DataViewsProvider<readonly SchemaFieldDefinition[], TRow>;
  readonly scopes: RowScopes<TRow>;
  readonly columns: readonly DataTableColumn[];
  readonly fields: readonly string[];
  readonly selectable: boolean;
  readonly rowLabel: (row: TRow, rowId: string) => string;
  /**
   * Why there are no rows, or why the rows shown are an earlier query's
   * after the current one failed; null while the rows shown answer the
   * current query, or while they await its replacement (which the table
   * marks busy).
   */
  readonly status: DataTableStatus | null;
  readonly renderStatus: (status: DataTableStatus) => ReactNode;
};
