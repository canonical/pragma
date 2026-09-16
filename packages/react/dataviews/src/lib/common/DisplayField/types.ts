/**
 * The field declaration every renderer shows a record by, and the props a
 * field's own content receives. Together because a field's `cell` is typed by
 * the props every renderer hands it, whichever renderer draws it.
 */

import type { ComponentType, ReactNode } from "react";

/**
 * The props one field's content receives, in whichever renderer draws it.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type DisplayFieldCellProps = {
  /** The field's current value. */
  readonly value: unknown;
  /** The row's stable identity. */
  readonly rowId: string;
  /** The declaring field's identity: a table's column, a card's field. */
  readonly columnId: string;
};

/**
 * One field a renderer shows. Field meaning supplies the default content;
 * `cell` supplies the exceptional content — a badge, a link, an action menu —
 * for the one field that needs it, without making the caller author every
 * header and value. A table's column is one, with what a column adds.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type DisplayField = {
  /** The field's identity, unique within its renderer. */
  readonly id: string;
  /** The field's heading. */
  readonly header: ReactNode;
  /** The record field shown. Defaults to the id. */
  readonly field?: string;
  /**
   * Field-specific content. Rendered inside the cell's scope, so it may call
   * `useDataViewsCell` for the row's channels. Without one, primitive values
   * render as text and every other value renders nothing.
   */
  readonly cell?: ComponentType<DisplayFieldCellProps>;
};
