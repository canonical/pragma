import type { IconName } from "@canonical/ds-assets";
import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /**
   * The row's label in the `<summary>` — composed, not a string prop,
   * matching `Accordion.Item`'s `heading`/`children` split.
   */
  heading?: ReactNode;
  /** Leading icon (start slot), by ds-assets icon name. */
  icon?: IconName;
  /** Whether the item (and its disclosure) is interactive. */
  disabled?: boolean;
  /**
   * Initial open state when uncontrolled. Defaults to `false`. Seed from
   * whether the active item is among this item's children (the 24.04
   * spec §5) so the current page's ancestor chain starts expanded.
   */
  defaultExpanded?: boolean;
  /**
   * Whether activating a child link or button collapses the disclosure —
   * Footer behaviour (a footer row is chosen with it, like a menu choice
   * dismissing its menu). The content tree does not opt in; its branch
   * stays open so the active row remains visible (the 24.04 spec §5).
   * Defaults to `false`.
   */
  collapseOnChildClick?: boolean;
  /** The disclosed children — typically a list of SideNavigation.Item. */
  children?: ReactNode;
};

export type ItemExpandableProps = OwnProps &
  Omit<ComponentProps<"li">, keyof OwnProps>;
