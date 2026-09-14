import type { ColumnSizing, SizingBounds } from "./types.js";

/**
 * The widths a column may be given, from its declared sizing — never from
 * an override, so a column resized once is held to the same bounds the
 * next time. A flexible column is held to its minimum and maximum; a fixed
 * one may go anywhere from zero.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function readSizingBounds(sizing: ColumnSizing): SizingBounds {
  return sizing.kind === "flex"
    ? { min: sizing.minPx, max: sizing.maxPx ?? Number.POSITIVE_INFINITY }
    : { min: 0, max: Number.POSITIVE_INFINITY };
}
