import type { _Item, Item } from "@canonical/ds-types";
import type { UseNavigationTreeResult } from "../types.js";
import type { DisclosureTogglePropsResult } from "./types.js";

/**
 * Build ARIA props for a disclosure toggle button.
 *
 * @param _nav - Navigation hook result (unused, reserved for future use)
 * @param _item - The annotated navigation item (unused, reserved for future use)
 * @param opts - Consumer-provided expansion state and target element ID
 * @returns ARIA attributes to spread on the toggle button
 */
export default function getDisclosureToggleProps<T extends Item = Item>(
  _nav: UseNavigationTreeResult<T>,
  _item: _Item<T>,
  opts: { expanded: boolean; controlsId: string },
): DisclosureTogglePropsResult {
  return {
    "aria-expanded": opts.expanded,
    "aria-controls": opts.controlsId,
  };
}
