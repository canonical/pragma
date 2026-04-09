import type { _Item } from "@canonical/ds-types";
import type { UseNavigationTreeResult } from "../types.js";
import type {
  TreeItemPropsResult,
  TreeListItemPropsResult,
  TreeMenuPropsResult,
} from "./types.js";

/**
 * ARIA props for a tree or group container element.
 *
 * Depth 0 produces `role="tree"`. Depth 1+ produces `role="group"`.
 * The root tree should receive an accessible label.
 *
 * @param _nav - Navigation hook result (unused, reserved for future use)
 * @param opts - Depth of this container and accessible label
 * @returns ARIA attributes to spread on the container element
 */
export function treeMenuProps(
  _nav: UseNavigationTreeResult,
  opts: { depth: number; label?: string },
): TreeMenuPropsResult {
  return {
    role: opts.depth === 0 ? "tree" : "group",
    ...(opts.label ? { "aria-label": opts.label } : {}),
  };
}

/**
 * ARIA props for a treeitem element.
 *
 * Parent items (with children) get `aria-expanded` from the consumer-provided
 * `expanded` option. Leaf items never receive `aria-expanded` — this is a
 * WAI-ARIA requirement. Roving tabindex is based on the hook's state.
 *
 * @param nav - Navigation hook result for reading state
 * @param item - The annotated navigation item
 * @param opts - Consumer-provided expansion state (required for parent items)
 * @returns ARIA attributes to spread on the item element
 */
export function treeItemProps(
  nav: UseNavigationTreeResult,
  item: _Item,
  opts?: { expanded?: boolean },
): TreeItemPropsResult {
  const status = nav.getNodeStatus(item);
  const hasChildren = !!item.items?.length;
  const isRovingTarget =
    status.highlighted ||
    status.selected ||
    (!nav.highlightedItems.length &&
      !nav.selectedItems.length &&
      item === nav.annotatedRoot.items?.[0]);

  const result: TreeItemPropsResult = {
    role: "treeitem",
    tabIndex: isRovingTarget ? 0 : -1,
  };

  if (hasChildren && opts?.expanded !== undefined) {
    result["aria-expanded"] = opts.expanded;
  }

  return result;
}

/**
 * ARIA props for a list item element wrapping a treeitem.
 *
 * WAI-ARIA Tree View requires `role="none"` on `<li>` elements to remove
 * the implicit listitem role.
 *
 * @returns `{ role: "none" }`
 */
export function treeListItemProps(): TreeListItemPropsResult {
  return { role: "none" };
}
