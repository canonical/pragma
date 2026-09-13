import type {
  DataViewsProvider,
  RowRecord,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import type {
  ColumnLayout,
  ColumnSizing,
} from "@canonical/dataviews-core/bindings";
import type { ComponentProps, ComponentType, ReactNode } from "react";
import type { Windowed, default as windowed } from "./windowed.js";

/** The props one column's cell renderer receives. */
export type DataTableCellProps = {
  /** The cell's current field value. */
  readonly value: unknown;
  /** The row's stable identity. */
  readonly rowId: string;
  /** The column's identity. */
  readonly columnId: string;
};

/**
 * One rendered column. Field meaning supplies the default content; `cell`
 * supplies the exceptional content — a badge, a link, an action menu — for
 * the one column that needs it, without making the caller author every
 * header, row and cell.
 */
export type DataTableColumn = {
  /** The column's identity, unique within the table. */
  readonly id: string;
  /** The column's heading. */
  readonly header: ReactNode;
  /** The record field this column shows. Defaults to the column's id. */
  readonly field?: string;
  /**
   * Column-specific content. Rendered inside the cell's scope, so it may
   * call `useDataViewsCell` for the row's channels. Without one, primitive
   * values render as text and every other value renders nothing.
   */
  readonly cell?: ComponentType<DataTableCellProps>;
  /** Declared sizing. Defaults to a flexible column with a 96px minimum. */
  readonly sizing?: ColumnSizing;
  /**
   * Offer sorting on this column's field. Honoured only when the provider's
   * capabilities declare the field sortable and allow at least one sort
   * term, so the table never offers an ordering the source would refuse. On
   * a provider created without capabilities, a sortable column throws.
   */
  readonly sortable?: boolean;
  /**
   * Offer resizing of this column from its trailing edge, by pointer or
   * keyboard, held to the declared bounds of its sizing every time.
   *
   * The last column never offers it, whatever this says: its trailing edge is
   * the table's own edge, with nothing beyond it to resize against. It takes
   * whatever width the columns before it leave — past its own `maxPx` or
   * fixed width when there is room to spare — so it grows and shrinks as they
   * are resized, and keeps its resolved width once they no longer fit and the
   * table scrolls.
   */
  readonly resizable?: boolean;
};

/**
 * What the table says in place of its rows, or beside them. The no-rows
 * cases stay distinct: an unfiltered collection with nothing in it is not a
 * query that matched nothing, and neither is a failure. `loading` covers a
 * collection nothing displayable has arrived for yet, requested or not.
 * `stale` is shown above rows kept from an earlier query, because the
 * current one failed for `reason`; `refresh-failed` above rows that still
 * answer the current query, whose refresh failed — without it the failure
 * would show nothing at all.
 */
export type DataTableStatus =
  | { readonly status: "loading" }
  | { readonly status: "failed"; readonly reason: string }
  | { readonly status: "refresh-failed"; readonly reason: string }
  | { readonly status: "stale"; readonly reason: string }
  | { readonly status: "no-data" }
  | { readonly status: "no-results" };

/**
 * A table that mounts only the rows near its viewport. Made by
 * `virtualRows`, from `@canonical/dataviews-react/virtualization`: the one
 * entry point that loads the implementation, so a table that never imports
 * it never ships it.
 */
export type DataTableWindowing = {
  /** The implementation, private to the package: nothing to read here. */
  readonly [windowed]: Windowed;
};

type OwnProps<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object,
> = {
  /** The provider owning this collection's query, result and selection. */
  readonly provider: DataViewsProvider<TFields, TRow>;
  /** The rendered columns, in display order. */
  readonly columns: readonly DataTableColumn[];
  /** The table's accessible name. */
  readonly label: string;
  /**
   * The column-layout record holding declared sizing and user overrides.
   * Supply one to share user arrangement between two tables on the same
   * provider; omitted, the table keeps its own. On a provider with views,
   * the widths follow the collection's saved presentation and a resize is
   * saved to it; without views they last for the record's lifetime.
   */
  readonly layout?: ColumnLayout;
  /** Render a leading selection column backed by the provider's selection. */
  readonly selectable?: boolean;
  /**
   * Names one record, for its selection checkbox. Defaults to its
   * identity. Written as a lambda it costs nothing: the table always calls
   * the latest one and never re-renders a row because the function is new.
   */
  readonly rowLabel?: (row: TRow, rowId: string) => string;
  /**
   * Replaces the default text of a status: no rows to render, or rows that
   * no longer answer the current query. Held the same way as `rowLabel`:
   * the latest one is always called, and its identity alone never
   * re-renders the body.
   */
  readonly renderStatus?: (status: DataTableStatus) => ReactNode;
  /**
   * Mount only the rows near the viewport, from `virtualRows`. The table
   * becomes its own scroll viewport, no taller than the screen unless its
   * style says otherwise, and reports each row's logical position so that
   * a row not mounted is still counted. Omitted, every row is rendered.
   */
  readonly windowing?: DataTableWindowing;
};

/**
 * DataTable props. The root is a `div` carrying the table role, so it
 * extends native div props, less the ones the table owns: `children`,
 * because the table's content is its rows, which it renders itself; and
 * `role`, `aria-label`, `aria-labelledby`, `aria-busy` and `aria-rowcount`,
 * each of which the table sets from what it knows. `className`, `style` and
 * `ref` are merged with the table's own rather than clobbered by either
 * side.
 *
 * `ref` is honoured in both React forms: a callback ref that returns a
 * cleanup has that cleanup called on detach, and one that returns nothing is
 * called with `null` instead. A callback ref rebuilt on every render costs
 * nothing — the table holds the latest rather than re-attaching.
 */
export type DataTableProps<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = OwnProps<TFields, TRow> &
  Omit<
    ComponentProps<"div">,
    | keyof OwnProps<TFields, TRow>
    | "children"
    | "role"
    | "aria-label"
    | "aria-labelledby"
    | "aria-busy"
    | "aria-rowcount"
  >;
