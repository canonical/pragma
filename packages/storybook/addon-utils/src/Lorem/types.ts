import type { HTMLAttributes } from "react";

/**
 * Props for the Lorem component.
 */
export interface LoremProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of paragraphs to render. Defaults to 3. */
  paragraphs?: number;
}
