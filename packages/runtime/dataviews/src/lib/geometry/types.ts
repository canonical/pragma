/**
 * Column sizing intent and resolved geometry. Declared sizing is a fixed
 * pixel reservation or a flex weight with bounds; user resizing creates a
 * fixed override.
 */

/** Fixed sizing: reserve exactly these pixels. */
export type FixedSizing = {
  readonly kind: "fixed";
  readonly px: number;
};

/** Flex sizing: reserve `minPx`, then share remaining width by `weight` until `maxPx`. */
export type FlexSizing = {
  readonly kind: "flex";
  readonly weight: number;
  readonly minPx: number;
  readonly maxPx?: number;
};

/** One column's sizing intent. */
export type ColumnSizing = FixedSizing | FlexSizing;

/** A column the solver sizes: identity plus sizing intent. */
export type ColumnToSize = {
  readonly id: string;
  readonly sizing: ColumnSizing;
};

/** One resolved column width. */
export type ResolvedColumn = {
  readonly id: string;
  readonly width: number;
};
