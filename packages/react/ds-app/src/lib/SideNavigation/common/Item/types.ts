import type { ComponentProps, ComponentType } from "react";
import type { LeafNavItem, LinkComponentProps } from "../../types.js";

/**
 * Props for the default SideNavigation item renderer — a flat leaf row.
 *
 * Spreads the LeafNavItem fields directly (url, key, label, disabled, icon,
 * slot, …) plus presentational extras. Always a leaf: an entry with children
 * is a SideNavigation.ItemExpandable instead (SPEC.md §4.3) — Item never
 * shows a disclosure caret.
 */
type OwnProps = LeafNavItem & {
  /** Whether this item is the active (current) page. */
  active?: boolean;
  /** Component used to render navigable items. Defaults to `"a"`. */
  LinkComponent?: ComponentType<LinkComponentProps> | "a";
};

export type ItemProps = OwnProps & Omit<ComponentProps<"li">, keyof OwnProps>;
