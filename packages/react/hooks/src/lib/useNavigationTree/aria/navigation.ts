import type { _Item } from "@canonical/ds-types";
import type { UseNavigationTreeResult } from "../types.js";
import type { NavigationItemPropsResult } from "./types.js";

/**
 * ARIA props for a navigation link element.
 *
 * Plain navigation uses native `<nav>`, `<ul>`, `<a>` semantics — no role
 * overrides. The only ARIA attribute is `aria-current="page"` on the
 * currently selected item.
 *
 * @param nav - Navigation hook result for reading state
 * @param item - The annotated navigation item
 * @returns ARIA attributes to spread on the link element
 */
export function navigationItemProps(
  nav: UseNavigationTreeResult,
  item: _Item,
): NavigationItemPropsResult {
  const status = nav.getNodeStatus(item);
  return {
    ...(status.selected ? { "aria-current": "page" as const } : {}),
  };
}
