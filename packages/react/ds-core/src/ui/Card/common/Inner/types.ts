/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { HTMLAttributes, ReactNode } from "react";

export interface InnerProps extends HTMLAttributes<HTMLDivElement> {
  /* Additional CSS classes */
  className?: string;
  /* Child elements */
  children?: ReactNode;
}
