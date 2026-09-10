import type { IconName } from "@canonical/ds-assets";
import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /**
   * The row's own label, in the `<summary>` — composed, not a string prop
   * (matches `Accordion.Item`'s own `heading`/`children` split: `heading` is
   * the trigger's label, `children` is what disclosure reveals).
   */
  heading?: ReactNode;
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
  /**
   * Whether activating a leaf row inside the disclosure (a link or button
   * among the `children`) collapses it. Footer behaviour: choosing a footer
   * row is done with it, like a menu choice dismissing its menu. The
   * content tree does not opt in — its branch stays open so the active row
   * remains visible (SPEC.md §5). Defaults to `false`.
   */
  collapseOnChildClick?: boolean;
  /** The disclosed children — typically a list of SideNavigation.Item. */
  children?: ReactNode;
};

export type ItemExpandableProps = OwnProps &
  Omit<ComponentProps<"li">, keyof OwnProps>;
