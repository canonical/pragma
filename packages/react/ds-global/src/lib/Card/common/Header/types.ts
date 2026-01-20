import type { HTMLAttributes, ReactNode } from "react";

/**
 * Props for Card.Header
 *
 * @implements ds:global.subcomponent.card-header
 *
 * DSL anatomy:
 * - layout.type: flow
 * - layout.direction: horizontal
 * - layout.justify: space-between
 * - layout.align: center
 * - edges:
 *   - [0] title (cardinality: 1, slotName: default)
 *   - [1] actions (cardinality: 0..1, slotName: actions)
 */
export interface HeaderProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Title content (required)
   * Maps to DSL role: title (cardinality: 1, slotName: default)
   */
  children: ReactNode;
  /**
   * Optional actions slot (buttons, links, etc.)
   * Maps to DSL role: actions (cardinality: 0..1)
   */
  actions?: ReactNode;
}
