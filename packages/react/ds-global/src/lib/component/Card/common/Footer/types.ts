import type { HTMLAttributes, ReactNode } from "react";

/**
 * Props for Card.Footer
 *
 * @implements ds:global.subcomponent.card-footer
 */
export interface FooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Required child contents: tags and labels (e.g. `Chip`), not CTAs or links */
  children: ReactNode;
}
