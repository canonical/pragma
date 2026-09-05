import type { ComponentProps, ComponentType, ReactNode } from "react";
import type { LeafNavItem, LinkComponentProps } from "../../types.js";

/**
 * Props for the default SideNavigation item renderer — a flat leaf row.
 *
 * Spreads the LeafNavItem fields directly (url, key, disabled, icon, slot,
 * …) plus presentational extras. Content is composed via `children`
 * (matching every other DS control, e.g. `Button`) rather than a `label`
 * string prop — the data-driven path (`NavTree`, from a `root` tree, whose
 * authored `LeafNavItem.label` stays a plain string) passes its `label` in
 * as `children` rather than as a same-named prop. Always a leaf: an entry
 * with children is a SideNavigation.ItemExpandable instead (SPEC.md §4.3) —
 * Item never shows a disclosure caret.
 */
type OwnProps = Omit<LeafNavItem, "label"> & {
  /** Item content — composed, not a string prop (matches `Button`'s own `children`-as-label convention). */
  children?: ReactNode;
  /** Whether this item is the active (current) page. */
  active?: boolean;
  /** Component used to render navigable items. Defaults to `"a"`. */
  LinkComponent?: ComponentType<LinkComponentProps> | "a";
};

export type ItemProps = OwnProps & Omit<ComponentProps<"li">, keyof OwnProps>;
