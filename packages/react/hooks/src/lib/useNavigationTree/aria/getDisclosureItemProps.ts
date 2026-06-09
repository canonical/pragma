import type { _Item, Item } from "@canonical/ds-types";
import type { UseNavigationTreeResult } from "../types.js";
import type { DisclosureItemPropsResult } from "./types.js";

/**
 * Build ARIA props for a disclosure navigation link.
 *
 * Returns `aria-current="page"` on the selected item. No role overrides.
 *
 * @param nav - Navigation hook result for reading state
 * @param item - The annotated navigation item
 * @returns ARIA attributes to spread on the link element
 */
export default function getDisclosureItemProps<T extends Item = Item>(
  nav: UseNavigationTreeResult<T>,
  item: _Item<T>,
): DisclosureItemPropsResult {
  const status = nav.getNodeStatus(item);
  return {
    ...(status.selected ? { "aria-current": "page" as const } : {}),
  };
}
