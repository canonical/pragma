import type { ColumnSizing } from "@canonical/dataviews-core/bindings";

/**
 * The widths a resize may leave a column at, from its declared sizing —
 * never from a user override, so a column resized once is held to the same
 * bounds the next time. A flexible column is held to its minimum and
 * maximum; a fixed one may go anywhere from zero.
 */
export default function readBounds(sizing: ColumnSizing): {
  readonly min: number;
  readonly max: number;
} {
  return sizing.kind === "flex"
    ? { min: sizing.minPx, max: sizing.maxPx ?? Number.POSITIVE_INFINITY }
    : { min: 0, max: Number.POSITIVE_INFINITY };
}
