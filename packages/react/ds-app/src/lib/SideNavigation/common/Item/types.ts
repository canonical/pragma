import type { Item as NavItem } from "@canonical/ds-types";
import type { ComponentType, ReactNode } from "react";
import type { LinkComponentProps } from "../../types.js";

/**
 * Props for the default SideNavigation item renderer.
 *
 * Spreads the WD405 `Item` fields directly (url, key, label, disabled, items, …)
 * plus presentational extras. Mirrors the Breadcrumbs.Item contract so a custom
 * `Component` can be substituted via the WD405 override.
 */
export interface ItemProps extends NavItem {
  /** Whether this item is the active (current) page. */
  active?: boolean;
  /** Nesting depth (0 = first level). Used for indentation of children. */
  depth?: number;
  /** Component used to render navigable items. Defaults to `"a"`. */
  LinkComponent?: ComponentType<LinkComponentProps> | "a";
  /** Item content; falls back to `label`. */
  children?: ReactNode;
}
