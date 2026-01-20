/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { HTMLAttributes, ReactNode } from "react";

/**
 * Props for Card.Header
 *
 * @implements ds:global.subcomponent.card-header
 */
export interface HeaderProps extends HTMLAttributes<HTMLDivElement> {
  /* Required child contents */
  children: ReactNode;
  /* Additional CSS classes */
  className?: string;
}
