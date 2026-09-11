import type {
  DataViewsProvider,
  RowScope,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import type { Ref } from "react";
import type { DataTableColumn } from "../../types.js";

/**
 * Props of one rendered data row.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * deriving its root from the row scope and column model, not forwarding a
 * caller's native props.
 */
export type RowProps<TRow extends object> = {
  readonly provider: DataViewsProvider<readonly SchemaFieldDefinition[], TRow>;
  readonly scope: RowScope<TRow>;
  readonly columns: readonly DataTableColumn[];
  readonly fields: readonly string[];
  readonly selectable: boolean;
  readonly rowLabel: (row: TRow, rowId: string) => string;
  /** The row's logical position, reported only by a windowed table. */
  readonly position?: number;
  /** The row element, for a windowed table to measure. */
  readonly ref?: Ref<HTMLDivElement>;
};
