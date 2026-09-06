import type { _Item, Item } from "@canonical/ds-types";
import type { UseNavigationTreeResult } from "../types.js";
import type { MenuItemPropsResult } from "./types.js";

/**
 * Build ARIA props for a contextual-menu item element (`role="menuitem"`).
 *
 * The highlighted item is the single roving tab stop (`tabIndex` 0); the rest
 * are `-1`. An item with children is a submenu trigger, gaining `aria-haspopup`
 * and `aria-expanded`. Disabled items are marked `aria-disabled`.
 *
 * @param nav Navigation hook result for reading roving/highlight state.
 * @param item The annotated menu item.
 * @returns ARIA attributes to spread on the item element.
 */
export default function getMenuItemProps<T extends Item = Item>(
  nav: UseNavigationTreeResult<T>,
  item: _Item<T>,
): MenuItemPropsResult {
  const status = nav.getNodeStatus(item);
  const hasChildren = !!item.items?.length;
  // A menu has a single roving tab stop. The highlighted item wins; only when
  // nothing is highlighted does the selected tail item take the tab stop, so two
  // items never both become tabbable.
  const highlightedTail = nav.highlightedItems.at(-1);
  const isRovingTarget = highlightedTail ? status.highlighted : status.selected;

  const result: MenuItemPropsResult = {
    role: "menuitem",
    tabIndex: isRovingTarget ? 0 : -1,
  };

  if (hasChildren) {
    result["aria-haspopup"] = "menu";
    result["aria-expanded"] = nav.isOpen && status.inHighlightedBranch;
  }

  if (item.disabled) {
    result["aria-disabled"] = true;
  }

  return result;
}
