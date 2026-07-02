import type { HTMLAttributes, ReactNode } from "react";

export interface InlineCodeProps extends HTMLAttributes<HTMLElement> {
  /** The code to render. */
  children?: ReactNode;
}
