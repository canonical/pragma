import type { _Item } from "@canonical/ds-types";
import type { UseNavigationTreeResult } from "../types.js";
import type { TreeItemPropsResult } from "./types.js";

/**
 * Build ARIA props for a treeitem element.
 *
 * Parent items get `aria-expanded` from the consumer's `expanded` option.
 * Leaf items never receive `aria-expanded` (WAI-ARIA requirement).
 *
 * @param nav - Navigation hook result for reading state
 * @param item - The annotated navigation item
 * @param opts - Consumer-provided expansion state
 * @returns ARIA attributes to spread on the item element
 */
export default function getTreeItemProps(
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
