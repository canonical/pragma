import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /** Panel body. This is the only region that scrolls. */
  children: ReactNode;
  /**
   * Grow the content to take the space the header and footer leave, so a
   * short panel pushes its footer to the bottom edge. Defaults to false: the
   * content keeps its natural height and the footer follows it, so the
   * actions sit next to the text they refer to rather than at a distance.
   */
  fill?: boolean;
};

/**
 * Props for SidePanel.Content.
 *
 * Props extend the native props of the `<div>` root, so every attribute it
 * accepts (data-*, aria-*, event handlers, …) reaches the DOM.
 */
export type ContentProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps>;
