import type { GridInteraction, SortTerm } from "@canonical/dataviews-core";
import type { DataTableColumn } from "../../types.js";

/**
 * Props of one column header.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * deriving its root from the column model and the applied ordering, not
 * forwarding a caller's native props.
 */
export type HeaderCellProps = {
  readonly column: DataTableColumn;
  /** The record field this column shows and sorts on. */
  readonly field: string;
  /** This column's term in the applied ordering, if it has one. */
  readonly sort: SortTerm | undefined;
  /** Replace the applied ordering. */
  readonly setSort: (sort: readonly SortTerm[]) => void;
  readonly interaction: GridInteraction;
  /** The column's resolved width, for a resize capture. */
  readonly width: number;
  /** The id this header's label carries, for the resize control's name. */
  readonly labelId: string;
};
