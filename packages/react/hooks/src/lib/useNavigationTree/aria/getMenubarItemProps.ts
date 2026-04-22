import type { _Item } from "@canonical/ds-types";
import type { UseNavigationTreeResult } from "../types.js";
import type { MenubarItemPropsResult } from "./types.js";

/**
 * Build ARIA props for a menuitem element in a menubar/menu.
 *
 * Parent items (with children) get `aria-haspopup` and `aria-expanded`.
 * Leaf items get neither. Roving tabindex is based on hook state.
 *
 * @param nav - Navigation hook result for reading state
 * @param item - The annotated navigation item
 * @returns ARIA attributes to spread on the item element
 */
export default function getMenubarItemProps(
  nav: UseNavigationTreeResult,
  item: _Item,
): MenubarItemPropsResult {
  const status = nav.getNodeStatus(item);
  const hasChildren = !!item.items?.length;
  const isRovingTarget =
    status.highlighted ||
    status.selected ||
    (!nav.highlightedItems.length &&
      !nav.selectedItems.length &&
      item === nav.annotatedRoot.items?.[0]);

  const result: MenubarItemPropsResult = {
    role: "menuitem",
    tabIndex: isRovingTarget ? 0 : -1,
  };

  if (hasChildren) {
    result["aria-haspopup"] = true;
    result["aria-expanded"] = nav.isOpen && status.inHighlightedBranch;
  }

  return result;
}
