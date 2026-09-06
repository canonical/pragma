import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /** Panel body. This is the only region that scrolls. */
  children: ReactNode;
};

/**
 * Props for SidePanel.Content.
 *
 * Props extend the native props of the `<div>` root, so every attribute it
 * accepts (data-*, aria-*, event handlers, …) reaches the DOM.
 */
export type ContentProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps>;
