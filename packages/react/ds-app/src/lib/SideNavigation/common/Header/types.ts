import type { HTMLAttributes, ReactNode } from "react";

export interface HeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Brand content (logo/wordmark) rendered at the start of the header. */
  children?: ReactNode;
  /** Whether the navigation is currently expanded. Passed to the collapse toggle. */
  expanded?: boolean;
  /** Handler invoked when the collapse toggle is activated. When omitted, the toggle is not rendered. */
  onToggle?: () => void;
  /** id of the navigation region the collapse toggle controls (`aria-controls`). */
  collapseControls?: string;
}
