import type { SortDirection } from "@canonical/dataviews-core";
import type {
  GridInteraction,
  SizingBounds,
} from "@canonical/dataviews-core/bindings";
import type { DataTableColumn } from "../../types.js";

/** Where one column's field stands in the ordering in force. */
export type SortPlacement = {
  readonly direction: SortDirection;
  /** One-based precedence among the ordering's terms. */
  readonly position: number;
  /** How many terms the ordering has. */
  readonly count: number;
};

/**
 * Props of one header cell.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * deriving its root from the column model and the ordering in force, not
 * forwarding a caller's native props.
 */
export type HeaderCellProps = {
  readonly column: DataTableColumn;
  /**
   * Whether this header offers sorting: the column asks for it and the
   * provider's capabilities declare its field sortable and allow at least
   * one sort term.
   */
  readonly sortable: boolean;
  /**
   * Where this column's field stands in the ordering in force — the query's
   * own terms, or the source's default when it states none — or null when
   * the ordering does not name it. Shown whether or not the column offers
   * sorting: a column the rows are ordered by says so.
   */
  readonly placement: SortPlacement | null;
  /**
   * Whether this header carries `aria-sort`: the column of the ordering's
   * first term, and only the first column showing that field. Every other
   * header omits it, so exactly one claims the sort.
   */
  readonly primary: boolean;
  /**
   * The destination a plain activation leads to without scripting — the
   * next ordering, from the first page, as `?query` — or null where the
   * provider has no location to lead to.
   */
  readonly destination: string | null;
  /**
   * Whether scripts have taken over. Before then a sortable header is its
   * link, or a plain label without a destination; after, a button.
   */
  readonly hydrated: boolean;
  /**
   * Why the last activation of this header changed nothing, announced
   * politely, or null.
   */
  readonly reason: string | null;
  /** Activate this column's sort, as a further term when `additive`. */
  readonly onSort: (additive: boolean) => void;
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
  readonly bounds: SizingBounds;
  /** The column's resolved width, for a resize capture. */
  readonly width: number;
  /** The id this header's label carries, for the resize handle's name. */
  readonly labelId: string;
};
