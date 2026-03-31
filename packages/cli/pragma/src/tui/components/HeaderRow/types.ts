import type { ColumnDef } from "../../../domains/shared/contracts.js";

export interface HeaderRowProps<T> {
  /** Visible columns to render labels for. */
  readonly columns: readonly ColumnDef<T>[];
  /** Computed widths for each column. */
  readonly widths: readonly number[];
}
