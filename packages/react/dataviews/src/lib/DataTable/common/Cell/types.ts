import type {
  DataViewsProvider,
  RowScope,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import type { DataTableColumn } from "../../types.js";

/**
 * Props of one rendered data cell.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * deriving its root from the row scope and column model, not forwarding a
 * caller's native props.
 */
export type CellProps<TRow extends object> = {
  readonly provider: DataViewsProvider<readonly SchemaFieldDefinition[], TRow>;
  readonly scope: RowScope<TRow>;
  readonly column: DataTableColumn;
  readonly field: string;
};
