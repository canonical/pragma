import type { _Item } from "@canonical/ds-types";
import type { UseNavigationTreeResult } from "../types.js";
import type {
  DisclosureItemPropsResult,
  DisclosureTogglePropsResult,
} from "./types.js";

/**
 * ARIA props for a disclosure toggle button.
 *
 * The toggle controls visibility of a section's children. `aria-expanded`
 * reflects the consumer-provided expansion state. `aria-controls` points
 * to the ID of the controlled section.
 *
 * @param _nav - Navigation hook result (unused, reserved for future use)
 * @param _item - The annotated navigation item (unused, reserved for future use)
 * @param opts - Consumer-provided expansion state and target element ID
 * @returns ARIA attributes to spread on the toggle button element
 */
export function disclosureToggleProps(
  _nav: UseNavigationTreeResult,
  _item: _Item,
  opts: { expanded: boolean; controlsId: string },
): DisclosureTogglePropsResult {
  return {
    "aria-expanded": opts.expanded,
    "aria-controls": opts.controlsId,
  };
}

/**
 * ARIA props for a disclosure navigation link.
 *
 * Returns `aria-current="page"` on the selected item. No role overrides —
 * disclosure navigation uses native `<a>` semantics.
 *
 * @param nav - Navigation hook result for reading state
 * @param item - The annotated navigation item
 * @returns ARIA attributes to spread on the link element
 */
export function disclosureItemProps(
  nav: UseNavigationTreeResult,
  item: _Item,
): DisclosureItemPropsResult {
  const status = nav.getNodeStatus(item);
  return {
    ...(status.selected ? { "aria-current": "page" as const } : {}),
  };
}
