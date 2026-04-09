import type { _Item } from "@canonical/ds-types";
import type { UseNavigationTreeResult } from "../types.js";
import type { NavigationItemPropsResult } from "./types.js";

/**
 * Build ARIA props for a navigation link element.
 *
 * Returns `aria-current="page"` on the selected item. No role overrides.
 *
 * @param nav - Navigation hook result for reading state
 * @param item - The annotated navigation item
 * @returns ARIA attributes to spread on the link element
 */
export default function getNavigationItemProps(
  nav: UseNavigationTreeResult,
  item: _Item,
): NavigationItemPropsResult {
  const status = nav.getNodeStatus(item);
  return {
    ...(status.selected ? { "aria-current": "page" as const } : {}),
  };
}
