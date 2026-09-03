import type { HTMLAttributes, ReactNode } from "react";

/** Props for SidePanel.Header */
export interface HeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Heading content. Names the panel for assistive technology. */
  children: ReactNode;
  /** Accessible name for the close button. Defaults to "Close panel". */
  dismissLabel?: string;
  /** Hide the close button, for a panel dismissed only from its footer. */
  dismissible?: boolean;
}
