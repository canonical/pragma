import type { _Item } from "@canonical/ds-types";
import type { UseNavigationTreeResult } from "../types.js";
import type {
  MenubarItemPropsResult,
  MenubarListItemPropsResult,
  MenubarMenuPropsResult,
} from "./types.js";

/**
 * ARIA props for a menubar or submenu container element.
 *
 * Depth 0 produces `role="menubar"`. Depth 1+ produces `role="menu"`.
 * Both accept an accessible label.
 *
 * @param _nav - Navigation hook result (unused, reserved for future use)
 * @param opts - Depth of this container and accessible label
 * @returns ARIA attributes to spread on the container element
 */
export function menubarMenuProps(
  _nav: UseNavigationTreeResult,
  opts: { depth: number; label?: string },
): MenubarMenuPropsResult {
  return {
    role: opts.depth === 0 ? "menubar" : "menu",
    ...(opts.label ? { "aria-label": opts.label } : {}),
  };
}

/**
 * ARIA props for a menuitem element in a menubar/menu.
 *
 * Parent items (with children) get `aria-haspopup="true"` and `aria-expanded`.
 * Leaf items get neither. Roving tabindex is applied based on the hook's
 * highlighted/selected state.
 *
 * @param nav - Navigation hook result for reading state
 * @param item - The annotated navigation item
 * @returns ARIA attributes to spread on the item element
 */
export function menubarItemProps(
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

/**
 * ARIA props for a list item element wrapping a menuitem.
 *
 * WAI-ARIA Menubar requires `role="none"` on `<li>` elements to remove
 * the implicit listitem role.
 *
 * @returns `{ role: "none" }`
 */
export function menubarListItemProps(): MenubarListItemPropsResult {
  return { role: "none" };
}
