import {
  type ColumnSizing,
  type ColumnToSize,
  sizingEquals,
} from "@canonical/dataviews-core/bindings";
import type { DataTableColumn } from "./types.js";

/**
 * How a table decides two column arrays say the same thing.
 *
 * A caller writing its columns as a literal rebuilds the array on every
 * render, and none of the table's machinery may notice: re-minting the
 * layout would drop every user-resized width, and a new array
 * reference alone would re-render every cell of every row. So the table
 * keys on content — and on two different readings of it, because an inline
 * `header` node must not cost anyone a new layout.
 */

/** Declared sizing when a column names none: flexible, with a 96px floor. */
export const defaultSizing: ColumnSizing = {
  kind: "flex",
  weight: 1,
  minPx: 96,
};

/** One column's declared sizing, defaulted. */
export const sizingOf = (column: DataTableColumn): ColumnSizing =>
  column.sizing ?? defaultSizing;

/** The field one column reads: its own, or its id when it names none. */
export const fieldOf = (column: DataTableColumn): string =>
  column.field ?? column.id;

/**
 * The widths a resize may leave a column at, from its declared sizing —
 * never from a user override, so a column resized once is held to the same
 * bounds the next time. A flexible column is held to its minimum and
 * maximum; a fixed one may go anywhere from zero.
 */
export const boundsOf = (
  sizing: ColumnSizing,
): { readonly min: number; readonly max: number } =>
  sizing.kind === "flex"
    ? { min: sizing.minPx, max: sizing.maxPx ?? Number.POSITIVE_INFINITY }
    : { min: 0, max: Number.POSITIVE_INFINITY };

/**
 * The column facts everything below the rendered tree is derived from: the
 * layout's declared tracks, the observed field names, the solved
 * geometry and one row scope per identity.
 */
export const sameColumnModel = (
  a: readonly DataTableColumn[],
  b: readonly DataTableColumn[],
): boolean =>
  a.length === b.length &&
  a.every((column, position) => {
    // In range: the lengths were compared first.
    const other = b[position] as DataTableColumn;
    return (
      column.id === other.id &&
      fieldOf(column) === fieldOf(other) &&
      sizingEquals(sizingOf(column), sizingOf(other))
    );
  });

/**
 * Everything the rendered tree reads, the model included. `header` and
 * `cell` are compared by reference: one is a node and the other a
 * component, and neither has content this could compare.
 */
export const sameColumns = (
  a: readonly DataTableColumn[],
  b: readonly DataTableColumn[],
): boolean =>
  sameColumnModel(a, b) &&
  a.every((column, position) => {
    // In range: the model comparison compared the lengths first.
    const other = b[position] as DataTableColumn;
    return (
      column.sortable === other.sortable &&
      column.resizable === other.resizable &&
      column.header === other.header &&
      column.cell === other.cell
    );
  });

/**
 * Two solved track lists say the same thing. The tracks are read through
 * the layout record on every render, so this is what keeps the
 * solver from running again for an unchanged arrangement.
 */
export const sameTracks = (
  a: readonly ColumnToSize[],
  b: readonly ColumnToSize[],
): boolean =>
  a.length === b.length &&
  a.every((track, position) => {
    // In range: the lengths were compared first.
    const other = b[position] as ColumnToSize;
    return track.id === other.id && sizingEquals(track.sizing, other.sizing);
  });
