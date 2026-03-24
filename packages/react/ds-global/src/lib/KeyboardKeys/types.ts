import type { HTMLAttributes, ReactNode } from "react";

export interface KeyboardKeysProps extends HTMLAttributes<HTMLDivElement> {
  /** Content to render inside the component */
  children?: ReactNode;
}
