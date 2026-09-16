import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /** Actions for the panel, laid out inline and aligned to the end edge. */
  children: ReactNode;
};

/**
 * Props for SidePanel.Footer.
 *
 * Props extend the native props of the `<div>` root, so every attribute it
 * accepts (data-*, aria-*, event handlers, …) reaches the DOM.
 */
export type FooterProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps>;
