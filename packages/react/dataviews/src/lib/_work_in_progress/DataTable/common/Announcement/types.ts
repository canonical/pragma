/**
 * The table's announcement: what it says after a change to its columns,
 * the handle the table says it through, and its props.
 */

import type { Ref } from "react";
import type { DataTableColumn } from "../../types.js";

/**
 * What the table announces after a change to its columns: a column hidden,
 * one that cannot be, one shown or moved with where it now stands among the
 * shown columns, or the settings reset.
 */
export type ColumnAnnouncement =
  | {
      readonly kind: "hidden" | "always-shown";
      readonly column: DataTableColumn;
    }
  | {
      readonly kind: "shown" | "moved";
      readonly column: DataTableColumn;
      /** One-based place among the shown columns. */
      readonly position: number;
      /** How many columns show. */
      readonly count: number;
    }
  | { readonly kind: "reset" };

/** What the table holds of its announcement: the way to say something. */
export type AnnouncementHandle = {
  /** Say what a change to the columns did, read again even when repeated. */
  readonly announce: (subject: ColumnAnnouncement) => void;
};

/**
 * Props of the table's announcement.
 *
 * Exempt from the native-prop extension convention: an internal live region
 * whose every attribute is its own.
 */
export type AnnouncementProps = {
  /** Receives the handle the table announces through. */
  readonly ref: Ref<AnnouncementHandle>;
};
