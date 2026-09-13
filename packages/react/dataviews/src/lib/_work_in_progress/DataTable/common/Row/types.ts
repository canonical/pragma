import type {
  DataViewsProvider,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import type { RowChannels } from "@canonical/dataviews-core/bindings";
import type { Ref } from "react";
import type { DataTableColumn } from "../../types.js";

/**
 * Props of one rendered data row.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * deriving its root from the row channels and column model, not forwarding a
 * caller's native props.
 */
export type RowProps<TRow extends object> = {
  readonly provider: DataViewsProvider<readonly SchemaFieldDefinition[], TRow>;
  readonly channels: RowChannels<TRow>;
  readonly columns: readonly DataTableColumn[];
  readonly selectable: boolean;
  readonly rowLabel: (row: TRow, rowId: string) => string;
  /** The row's logical position, reported only by a windowed table. */
  readonly position?: number;
  /** The row element, for a windowed table to measure. */
  readonly ref?: Ref<HTMLDivElement>;
};
