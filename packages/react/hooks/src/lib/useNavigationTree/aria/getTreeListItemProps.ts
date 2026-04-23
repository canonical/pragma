import type { TreeListItemPropsResult } from "./types.js";

/**
 * Build ARIA props for a list item wrapping a treeitem.
 *
 * WAI-ARIA Tree View requires `role="none"` on `<li>` elements.
 *
 * @returns `{ role: "none" }`
 */
export default function getTreeListItemProps(): TreeListItemPropsResult {
  return { role: "none" };
}
