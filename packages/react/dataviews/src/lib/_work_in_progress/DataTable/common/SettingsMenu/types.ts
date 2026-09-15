/**
 * The settings menu's contract — its props — and where each change leads
 * without scripting, which the table spells for the menu alone.
 */

import type { ColumnChange, ColumnSetting } from "../types.js";

/**
 * Where every change leads without scripting — the same query, carrying the
 * arrangement the change leaves, as `?query` — spelled over one reading of
 * the query.
 */
export type SettingsDestinations = {
  /**
   * Each change a column takes, keyed `<change>:<column id>`; a change that
   * would leave the arrangement as it is has none.
   */
  readonly changes: ReadonlyMap<string, string>;
  /** Where a reset leads: the same query, carrying no arrangement. */
  readonly reset: string;
};

/**
 * Props of the table's settings menu.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * whose root is a disclosure before scripts run and the design system's
 * menu after, forwarding no caller's native props.
 */
export type SettingsMenuProps = {
  /** Every declared column, in the arrangement's order, hidden ones included. */
  readonly settings: readonly ColumnSetting[];
  /** Whether a reset would change the viewer's own layer. */
  readonly resettable: boolean;
  /**
   * Whether scripts have taken over. Before then the menu is a disclosure
   * of real links; after, the design system's menu.
   */
  readonly hydrated: boolean;
  /** Apply one change to one column. One identity while the table holds. */
  readonly onChange: (columnId: string, change: ColumnChange) => void;
  /** Return to the arrangement beneath the viewer's own changes. */
  readonly onReset: () => void;
  /**
   * Where every change and the reset lead without scripting, or null where
   * the provider has no location to lead to. Read only before scripts run.
   */
  readonly listDestinations: () => SettingsDestinations | null;
};
