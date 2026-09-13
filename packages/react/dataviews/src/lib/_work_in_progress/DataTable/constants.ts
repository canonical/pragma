import type { ColumnSizing } from "@canonical/dataviews-core/bindings";

/** Declared sizing when a column names none: flexible, with a 96px floor. */
export const DEFAULT_SIZING: ColumnSizing = {
  kind: "flex",
  weight: 1,
  minPx: 96,
};
