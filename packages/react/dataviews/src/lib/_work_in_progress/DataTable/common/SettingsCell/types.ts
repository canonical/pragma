import type { ReactElement } from "react";
import type { SettingsMenuProps } from "../SettingsMenu/index.js";

/**
 * Props of the settings header cell.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * holding what the table was given as its settings, not forwarding a
 * caller's native props.
 */
export type SettingsCellProps = {
  /** What the table was given as its `settings`, drawn in the cell. */
  readonly settings: ReactElement;
  /** The menu's facts and commands, which what is drawn in the cell reads. */
  readonly menu: SettingsMenuProps;
  /**
   * Attaches this cell to the table's geometry. The stylesheet sizes the
   * settings track, and the columns share whatever width it leaves.
   */
  readonly reserve: (cell: HTMLDivElement) => () => void;
};
