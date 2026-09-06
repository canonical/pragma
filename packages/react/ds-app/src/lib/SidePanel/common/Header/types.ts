import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /** Heading content. Names the panel for assistive technology. */
  children: ReactNode;
  /** Accessible name for the close button. Defaults to "Close panel". */
  dismissLabel?: string;
  /** Hide the close button, for a panel dismissed only from its footer. */
  dismissible?: boolean;
};

/**
 * Props for SidePanel.Header.
 *
 * Props extend the native props of the `<div>` root, so every attribute it
 * accepts (data-*, aria-*, event handlers, …) reaches the DOM.
 */
export type HeaderProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps>;
