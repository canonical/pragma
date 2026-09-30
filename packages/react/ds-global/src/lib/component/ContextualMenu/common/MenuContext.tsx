import type { _Item } from "@canonical/ds-types";
import { createContext, useContext } from "react";
import type { UseContextualMenuResult } from "../../../hooks/index.js";
import type { MenuItem } from "../types.js";

/**
 * The shared menu API threaded to every level of a (possibly nested) contextual
 * menu. There is ONE {@link useContextualMenu} per menu instance — submenus are
 * render-only and read this context rather than owning their own state, so the
 * whole tree shares one highlight path, one roving focus, and one keyboard
 * handler.
 */
export interface MenuContextValue
  extends Pick<
    UseContextualMenuResult,
    | "getItemProps"
    | "getMenuProps"
    | "getNodeStatus"
    | "highlightItem"
    | "close"
    | "isOpen"
  > {
  /** Activate an item (run the consumer's onSelect and close the menu). */
  onSelectItem: (item: _Item<MenuItem>) => void;
}

const MenuContext = createContext<MenuContextValue | null>(null);

/** Read the shared menu API. Throws if used outside a ContextualMenu. */
export const useMenuContext = (): MenuContextValue => {
  const value = useContext(MenuContext);
  if (!value) {
    throw new Error("useMenuContext must be used within a ContextualMenu.");
  }
  return value;
};

export default MenuContext;
