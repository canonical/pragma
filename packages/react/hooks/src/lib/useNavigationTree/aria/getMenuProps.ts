import type { Item } from "@canonical/ds-types";
import type { UseNavigationTreeResult } from "../types.js";
import type { MenuPropsResult } from "./types.js";

/**
 * Build ARIA props for a contextual-menu container element (`role="menu"`).
 *
 * Unlike a menubar, a contextual menu is always a vertical `menu`. Provide a
 * `label` for an accessible name, or `labelledBy` to reference the trigger.
 *
 * @param _nav Navigation hook result (unused, reserved for future use).
 * @param opts Accessible label or labelledby reference for the menu.
 * @returns ARIA attributes to spread on the menu container element.
 */
export default function getMenuProps<T extends Item = Item>(
  _nav: UseNavigationTreeResult<T>,
  opts: { label?: string; labelledBy?: string } = {},
): MenuPropsResult {
  return {
    role: "menu",
    // The menu is navigated with Up/Down arrows, so it is vertical. ARIA defaults
    // `menu` to vertical, but declaring it is explicit and future-proofs a
    // horizontal (menubar) variant.
    "aria-orientation": "vertical",
    ...(opts.label ? { "aria-label": opts.label } : {}),
    ...(opts.labelledBy ? { "aria-labelledby": opts.labelledBy } : {}),
  };
}
