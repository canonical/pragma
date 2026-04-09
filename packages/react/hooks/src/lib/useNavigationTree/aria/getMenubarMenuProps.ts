import type { UseNavigationTreeResult } from "../types.js";
import type { MenubarMenuPropsResult } from "./types.js";

/**
 * Build ARIA props for a menubar or submenu container element.
 *
 * Depth 0 produces `role="menubar"`. Depth 1+ produces `role="menu"`.
 *
 * @param _nav - Navigation hook result (unused, reserved for future use)
 * @param opts - Depth of this container and accessible label
 * @returns ARIA attributes to spread on the container element
 */
export default function getMenubarMenuProps(
  _nav: UseNavigationTreeResult,
  opts: { depth: number; label?: string },
): MenubarMenuPropsResult {
  return {
    role: opts.depth === 0 ? "menubar" : "menu",
    ...(opts.label ? { "aria-label": opts.label } : {}),
  };
}
