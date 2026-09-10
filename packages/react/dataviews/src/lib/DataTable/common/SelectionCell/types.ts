import type {
  DataViewsProvider,
  RowScope,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";

/**
 * Props of one row's selection cell.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * deriving its root from the row scope, not forwarding a caller's native
 * props.
 */
export type SelectionCellProps<TRow extends object> = {
  readonly provider: DataViewsProvider<readonly SchemaFieldDefinition[], TRow>;
  readonly scope: RowScope<TRow>;
  readonly selected: boolean;
  readonly rowLabel: (row: TRow, rowId: string) => string;
};
