import type { HTMLAttributes, ReactNode } from "react";

/**
 * Props for Card.Content
 *
 * @implements ds:global.subcomponent.card-content
 */
export interface ContentProps extends HTMLAttributes<HTMLDivElement> {
  /* Required child contents */
  children: ReactNode;
  /* Additional CSS classes */
  className?: string;
}
