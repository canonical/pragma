import type { ColumnDef } from "../../../domains/shared/contracts.js";

export interface DataRowProps<T> {
  /** The data item for this row. */
  readonly item: T;
  /** Visible columns to render. */
  readonly columns: readonly ColumnDef<T>[];
  /** Computed widths for each column. */
  readonly widths: readonly number[];
  /** URI prefix map for compacting IRIs. */
  readonly prefixes?: Readonly<Record<string, string>>;
  /** Domain name — indexes into DOMAIN_COLORS for coloring. */
  readonly domain: string;
}
