import type { ColumnSizing } from "./types.js";

/** Structural equality of two column sizings. */
export default function sizingEquals(
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
