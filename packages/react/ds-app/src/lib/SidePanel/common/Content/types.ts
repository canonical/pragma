import type { HTMLAttributes, ReactNode } from "react";

/** Props for SidePanel.Content */
export interface ContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Panel body. This is the only region that scrolls. */
  children: ReactNode;
}
