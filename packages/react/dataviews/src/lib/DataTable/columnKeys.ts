import type { ColumnSizing, ColumnToSize } from "@canonical/dataviews-core";
import { sizingEquals } from "@canonical/dataviews-core";
import type { DataTableColumn } from "./types.js";

/**
 * How a table decides two column arrays say the same thing.
 *
 * A caller writing its columns as a literal rebuilds the array on every
 * render, and none of the table's machinery may notice: re-minting the
 * presentation would drop every user-resized width, and a new array
 * reference alone would re-render every cell of every row. So the table
 * keys on content — and on two different readings of it, because an inline
 * `header` node must not cost anyone a new presentation.
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

/**
 * The column facts everything below the rendered tree is derived from: the
 * presentation's declared tracks, the observed field names, the solved
 * geometry and one row scope per identity.
 */
export const sameColumnModel = (
  a: readonly DataTableColumn[],
  b: readonly DataTableColumn[],
): boolean =>
  a.length === b.length &&
  a.every((column, position) => {
    const other = b[position];
    return (
      column.id === other.id &&
      (column.field ?? column.id) === (other.field ?? other.id) &&
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
    const other = b[position];
    return (
      column.sortable === other.sortable &&
      column.resizable === other.resizable &&
      column.header === other.header &&
      column.cell === other.cell
    );
  });

/**
 * Two solved track lists say the same thing. The tracks are read through
 * the presentation record on every render, so this is what keeps the
 * solver from running again for an unchanged arrangement.
 */
export const sameTracks = (
  a: readonly ColumnToSize[],
  b: readonly ColumnToSize[],
): boolean =>
  a.length === b.length &&
  a.every((track, position) => {
    const other = b[position];
    return track.id === other.id && sizingEquals(track.sizing, other.sizing);
  });
