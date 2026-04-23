import type { _Item } from "@canonical/ds-types";
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
export default function getDisclosureToggleProps(
  _nav: UseNavigationTreeResult,
  _item: _Item,
  opts: { expanded: boolean; controlsId: string },
): DisclosureTogglePropsResult {
  return {
    "aria-expanded": opts.expanded,
    "aria-controls": opts.controlsId,
  };
}
