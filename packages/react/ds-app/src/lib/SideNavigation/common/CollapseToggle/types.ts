import type { ComponentProps } from "react";

type OwnProps = {
  /**
   * Whether the navigation is currently expanded. Drives `aria-expanded` and
   * the default `aria-label`. Controlled by the parent SideNavigation.
   */
  expanded?: boolean;
};

/**
 * `type` is excluded in addition to `OwnProps`: this is always a disclosure
 * trigger, never a form submit/reset control, so the DS fixes it to
 * `"button"` rather than exposing it.
 */
export type CollapseToggleProps = OwnProps &
  Omit<ComponentProps<"button">, keyof OwnProps | "type">;
