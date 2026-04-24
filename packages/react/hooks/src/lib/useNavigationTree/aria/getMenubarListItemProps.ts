import type { MenubarListItemPropsResult } from "./types.js";

/**
 * Build ARIA props for a list item wrapping a menuitem.
 *
 * WAI-ARIA Menubar requires `role="none"` on `<li>` elements.
 *
 * @returns `{ role: "none" }`
 */
export default function getMenubarListItemProps(): MenubarListItemPropsResult {
  return { role: "none" };
}
