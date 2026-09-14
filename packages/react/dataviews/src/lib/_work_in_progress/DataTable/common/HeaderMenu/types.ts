import type { SortDirection } from "@canonical/dataviews-core";
import type { ReactNode } from "react";

/**
 * Props of one column header's menu.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * the header cell composes, forwarding no caller's native props.
 */
export type HeaderMenuProps = {
  /** The column the menu sorts, handed back with each choice. */
  readonly columnId: string;
  /** The column's heading, which names the menu's trigger. */
  readonly header: ReactNode;
  /**
   * Whether the reader's own ordering names this column, so it can be
   * removed.
   */
  readonly removable: boolean;
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
};
