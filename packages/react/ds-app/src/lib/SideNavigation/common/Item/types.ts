import type { ComponentType } from "react";
import type { LinkComponentProps, NavItem } from "../../types.js";

/**
 * Props for the default SideNavigation item renderer — a flat leaf row.
 *
 * Spreads the NavItem fields directly (url, key, label, disabled, icon, slot,
 * items, …) plus presentational extras. The item is NOT recursive: traversal
 * lives in NavTree's two loops. The end slot is derived — an item with subitems
 * shows a disclosure caret; a leaf shows its optional `slot`.
 */
export interface ItemProps extends NavItem {
  /** Whether this item is the active (current) page. */
  active?: boolean;
  /** Component used to render navigable items. Defaults to `"a"`. */
  LinkComponent?: ComponentType<LinkComponentProps> | "a";
}
