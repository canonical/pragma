import type { ColumnSizing } from "./types.js";

/**
 * Structural equality of two column sizings.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function areSizingsEqual(
  a: ColumnSizing,
  b: ColumnSizing,
): boolean {
  return a.kind === "fixed"
    ? b.kind === "fixed" && a.px === b.px
    : b.kind === "flex" &&
        a.weight === b.weight &&
        a.minPx === b.minPx &&
        a.maxPx === b.maxPx;
}
