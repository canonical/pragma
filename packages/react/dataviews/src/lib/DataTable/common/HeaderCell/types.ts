import type { GridInteraction, SortTerm } from "@canonical/dataviews-core";
import type { DataTableColumn } from "../../types.js";

/**
 * Props of one header cell.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * deriving its root from the column model and the applied ordering, not
 * forwarding a caller's native props.
 */
export type HeaderCellProps = {
  readonly column: DataTableColumn;
  /** The record field this column shows and sorts on. */
  readonly field: string;
  /**
   * Whether this header offers sorting: the column asks for it and the
   * provider's capabilities declare its field sortable and allow at least
   * one sort term.
   */
  readonly sortable: boolean;
  /** This column's term in the applied ordering, if it has one. */
  readonly sort: SortTerm | undefined;
  /** Replace the applied ordering. */
  readonly setSort: (sort: readonly SortTerm[]) => void;
  readonly interaction: GridInteraction;
  /**
   * Offer a resize handle at this header cell's trailing edge. False for the
   * last column whatever it declares: its trailing edge is the table's own
   * edge.
   */
  readonly resizable: boolean;
  /**
   * The widths a resize may leave this column at, from the declared sizing
   * the table's widths are solved from.
   */
  readonly bounds: { readonly min: number; readonly max: number };
  /** The column's resolved width, for a resize capture. */
  readonly width: number;
  /** The id this header's label carries, for the resize handle's name. */
  readonly labelId: string;
};
