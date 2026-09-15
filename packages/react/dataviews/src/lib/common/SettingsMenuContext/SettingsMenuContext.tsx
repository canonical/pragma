import { createContext, type ReactElement } from "react";

/**
 * React context carrying a table's settings menu, rendered, installed by the
 * table in its header's settings cell. What the table was given as its
 * settings reads it, so no part outside the table depends on how the menu is
 * built; null outside a settings cell.
 */
const SettingsMenuContext = createContext<ReactElement | null>(null);

export default SettingsMenuContext;
