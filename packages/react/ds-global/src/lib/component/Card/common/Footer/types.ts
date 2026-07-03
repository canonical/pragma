import type { HTMLAttributes, ReactNode } from "react";

/**
 * Props for Card.Footer
 *
 * @implements dso:global.subcomponent.card-footer
 */
export interface FooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Required child contents */
  children: ReactNode;
}
