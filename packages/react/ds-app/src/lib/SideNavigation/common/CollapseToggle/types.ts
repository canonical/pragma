import type { ButtonHTMLAttributes } from "react";

export interface CollapseToggleProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Whether the navigation is currently expanded. Drives `aria-expanded` and
   * the default `aria-label`. Controlled by the parent SideNavigation.
   */
  expanded?: boolean;
}
