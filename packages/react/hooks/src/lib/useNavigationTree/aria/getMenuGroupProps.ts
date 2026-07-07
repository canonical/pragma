import type { Item } from "@canonical/ds-types";
import type { UseNavigationTreeResult } from "../types.js";
import type { MenuGroupPropsResult } from "./types.js";

/**
 * Build ARIA props for a contextual-menu group element (`role="group"`).
 *
 * Groups partition a menu's items. Provide a `label` for an accessible name, or
 * `labelledBy` to reference a visible group heading.
 *
 * @param _nav Navigation hook result (unused, reserved for future use).
 * @param opts Accessible label or labelledby reference for the group.
 * @returns ARIA attributes to spread on the group element.
 */
export default function getMenuGroupProps<T extends Item = Item>(
  _nav: UseNavigationTreeResult<T>,
  opts: { label?: string; labelledBy?: string } = {},
): MenuGroupPropsResult {
  return {
    role: "group",
    ...(opts.label ? { "aria-label": opts.label } : {}),
    ...(opts.labelledBy ? { "aria-labelledby": opts.labelledBy } : {}),
  };
}
