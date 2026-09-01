import type { HTMLAttributes, ReactNode } from "react";

/** Props for SidePanel.Footer */
export interface FooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Actions for the panel, laid out inline and aligned to the end edge. */
  children: ReactNode;
}
