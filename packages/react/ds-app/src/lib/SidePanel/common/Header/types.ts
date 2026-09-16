import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /**
   * Title content. Names the panel for assistive technology.
   *
   * The title is deliberately not a heading element: the panel is a layer on
   * top of the page, not part of its document outline, so it names the dialog
   * through `aria-labelledby` instead.
   */
  children: ReactNode;
  /** Accessible name for the close button. Defaults to "Close panel". */
  dismissLabel?: string;
  /**
   * Hide the close button, for a panel dismissed only from its footer.
   * Defaults to false, so the close button is shown.
   */
  undismissible?: boolean;
};

/**
 * Props for SidePanel.Header.
 *
 * Props extend the native props of the `<div>` root, so every attribute it
 * accepts (data-*, aria-*, event handlers, …) reaches the DOM.
 */
export type HeaderProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps>;
