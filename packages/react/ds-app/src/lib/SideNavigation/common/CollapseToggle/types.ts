import type { ComponentProps } from "react";

type OwnProps = {
  /**
   * Whether the navigation is currently expanded. Drives `aria-expanded` and
   * the default `aria-label`. Controlled by the parent SideNavigation.
   */
  expanded?: boolean;
};

export type CollapseToggleProps = OwnProps &
  Omit<ComponentProps<"button">, keyof OwnProps>;
