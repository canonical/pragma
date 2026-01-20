import type { HTMLAttributes, ReactNode } from "react";

/**
 * Props for the Accordion.Item subcomponent
 *
 * @implements dso:global.subcomponent.accordion-item
 *
 * Anatomy (from DSL):
 * - layout.type: stack
 * - layout.direction: vertical
 * - edges:
 *   - header tab (slotName: header, cardinality: 1)
 *     - control (chevron, cardinality: 1)
 *     - heading (slotName: default, cardinality: 1)
 *   - content panel (slotName: default, cardinality: 1)
 */
export interface ItemProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The heading text displayed in the accordion item header
   * Maps to DSL role: heading (cardinality: 1)
   */
  heading: ReactNode;
  /**
   * The content revealed when the accordion item is expanded
   * Maps to DSL role: content panel (cardinality: 1)
   */
  children: ReactNode;
  /**
   * Whether the accordion item is expanded
   * @default false
   */
  expanded?: boolean;
  /**
   * Callback fired when the expanded state changes
   */
  onExpandedChange?: (expanded: boolean) => void;
}
