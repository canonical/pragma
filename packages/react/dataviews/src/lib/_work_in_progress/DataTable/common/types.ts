/**
 * The facts the table's common parts share, which the table derives once for
 * every part that changes a column: the changes a column takes, and each
 * declared column as the arrangement in force places it.
 */

import type { DataTableColumn } from "../types.js";

/** One change to one column that the table's menus offer. */
export type ColumnChange = "hide" | "show" | "move-left" | "move-right";

/** Which changes a column takes now, each true where it would do something. */
export type ColumnOffers = Readonly<Record<ColumnChange, boolean>>;

/** One declared column as the settings menu offers it. */
export type ColumnSetting = {
  readonly column: DataTableColumn;
  /** Whether the arrangement in force hides the column. */
  readonly hidden: boolean;
  /**
   * Which changes the column takes now, each true only where it would change
   * the arrangement: never hiding the last column shown or one declared
   * `hideable: false`, never moving a hidden column or one past either end.
   */
  readonly offers: ColumnOffers;
};
