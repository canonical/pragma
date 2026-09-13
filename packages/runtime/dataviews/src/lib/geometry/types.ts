/**
 * Column geometry: the sizing a column declares — a fixed pixel
 * reservation or a flex weight with bounds — the width it resolves to, the
 * layout record holding user overrides over the declaration, and the live
 * resize preview that never touches the layout until it commits.
 *
 * Every length here, and everywhere else in this package, is in CSS pixels:
 * the `Px` suffixes say nothing the type does not, and are kept only
 * because retiring them reaches some two hundred places.
 */

import type { ReadonlyChannel } from "../observable/index.js";

/**
 * Fixed sizing: reserve exactly these pixels.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type FixedSizing = {
  readonly kind: "fixed";
  readonly px: number;
};

/**
 * Flex sizing: reserve `minPx`, then share remaining width by `weight` until `maxPx`.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type FlexSizing = {
  readonly kind: "flex";
  readonly weight: number;
  readonly minPx: number;
  readonly maxPx?: number;
};

/**
 * One column's sizing intent.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ColumnSizing = FixedSizing | FlexSizing;

/**
 * A column the solver sizes: identity plus sizing intent.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ColumnToSize = {
  readonly id: string;
  readonly sizing: ColumnSizing;
};

/**
 * One resolved column width.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ResolvedColumn = {
  readonly id: string;
  readonly width: number;
};

/**
 * Immutable layout snapshot: declared sizing plus user overrides.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ColumnLayoutState = {
  /** The declared sizing per column id. */
  readonly declared: Readonly<Record<string, ColumnSizing>>;
  /** User-fixed sizing overrides per column id. */
  readonly overrides: Readonly<Record<string, ColumnSizing>>;
  /** Bumped on every accepted layout change. */
  readonly revision: number;
};

/**
 * Handle of one column-layout record.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ColumnLayout = {
  /** The layout's snapshots; immutable between publications. */
  readonly state: ReadonlyChannel<ColumnLayoutState>;
  /** The declared sizing of one column, which every column of the layout has. */
  readonly readDeclared: (id: string) => ColumnSizing;
  /** The effective sizing of one column: its override, else its declared sizing. */
  readonly effective: (id: string) => ColumnSizing;
  /** Record a user-fixed sizing override (a resize commit). */
  readonly setOverride: (id: string, sizing: ColumnSizing) => void;
  /** Drop one column's override, restoring its declared sizing. */
  readonly resetOverride: (id: string) => void;
  /** Drop every override, restoring all declared sizing. */
  readonly resetOverrides: () => void;
  /** The columns to size: declared sizing with overrides applied. */
  readonly toColumns: () => readonly ColumnToSize[];
};

/**
 * The grid interaction state: idle, or one live resize preview.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type GridInteractionState =
  | { readonly status: "idle" }
  | {
      readonly status: "resizing";
      readonly columnId: string;
      readonly originX: number;
      readonly startWidth: number;
      readonly previewWidth: number;
    };

/**
 * Handle of one grid interaction record.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type GridInteraction = {
  /** The interaction's snapshots; immutable between publications. */
  readonly state: ReadonlyChannel<GridInteractionState>;
  /**
   * Begin a resize: capture the column, the pointer origin and the current
   * (resolved) starting width. Previews never mutate the authoritative
   * layout.
   */
  readonly startResize: (
    columnId: string,
    originX: number,
    startWidth: number,
  ) => void;
  /** Preview a pointer position; the width is clamped to the column's bounds. */
  readonly preview: (pointerX: number) => void;
  /** Commit the preview: the sizing override is applied to the layout. */
  readonly commit: () => void;
  /** Cancel: the authoritative layout is untouched, so nothing restores. */
  readonly cancel: () => void;
  /**
   * Begin watching the layout for the conflicting external changes
   * that invalidate a live preview; the return value detaches. Construction
   * subscribes to nothing, so an interaction whose caller never attaches it
   * holds no subscription to leak, and re-attaching is an ordinary second
   * call.
   */
  readonly observe: () => () => void;
};
