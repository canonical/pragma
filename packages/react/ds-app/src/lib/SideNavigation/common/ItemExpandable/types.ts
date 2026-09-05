import type { IconName } from "@canonical/ds-assets";
import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /** Identity field, mirroring LeafNavItem.key — not spread to the DOM. */
  key?: string;
  /** Display text. Text only, matching LeafNavItem's `label` — not JSX. */
  label?: string;
  /** Leading icon (start slot), by ds-assets icon name. */
  icon?: IconName;
  /** Whether the item (and its disclosure) is interactive. */
  disabled?: boolean;
  /**
   * Initial open/closed state when uncontrolled. Defaults to `false`. Seed
   * this from whether the active item is among this item's children
   * (SPEC.md §5) so the ancestor chain of the current page starts expanded.
   */
  defaultExpanded?: boolean;
  /** The disclosed children — typically a list of SideNavigation.Item. */
  children?: ReactNode;
};

export type ItemExpandableProps = OwnProps &
  Omit<ComponentProps<"li">, keyof OwnProps>;
