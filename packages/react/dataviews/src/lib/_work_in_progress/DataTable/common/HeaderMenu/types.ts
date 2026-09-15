import type { SortDirection } from "@canonical/dataviews-core";
import type { ReactNode } from "react";
import type { HeaderColumnChange, HeaderColumnOffers } from "../types.js";

/**
 * Props of one column header's menu.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * the header cell composes, forwarding no caller's native props.
 */
export type HeaderMenuProps = {
  /** The column the menu acts on, handed back with each choice. */
  readonly columnId: string;
  /** The column's heading, which names the menu's trigger. */
  readonly header: ReactNode;
  /** Whether the column offers sorting, so the menu carries its sort. */
  readonly sortable: boolean;
  /**
   * Whether the reader's own ordering names this column, so it can be
   * removed.
   */
  readonly removable: boolean;
  /**
   * Whether the viewer may hide the column: not declared `hideable: false`.
   * A column that may not is offered no Hide at all.
   */
  readonly hideable: boolean;
  /**
   * Which changes the column takes now: the menu's Hide, Move left and Move
   * right are disabled where the change would do nothing. One object while
   * the arrangement holds, so a render of the header row renders no menu
   * again.
   */
  readonly offers: HeaderColumnOffers;
  /**
   * Sort by a column in a direction. One identity for every column, so a
   * render of the header row renders no menu again.
   */
  readonly onPlace: (columnId: string, direction: SortDirection) => void;
  /**
   * Take a column out of the reader's ordering; one identity for every
   * column.
   */
  readonly onRemoveFromSort: (columnId: string) => void;
  /** Hide or move a column; one identity for every column. */
  readonly onChangeColumn: (
    columnId: string,
    change: HeaderColumnChange,
  ) => void;
};
