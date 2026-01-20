import type { HTMLAttributes, ReactNode } from "react";

/**
 * Props for the Breadcrumbs.Item subcomponent
 *
 * @implements dso:global.subcomponent.breadcrumbs-item
 *
 * Anatomy (from DSL):
 * - layout.type: flow
 * - layout.direction: horizontal
 * - layout.align: center
 * - edges:
 *   - [0] link (role: link, cardinality: 1, slotName: default)
 *   - [1] separator (role: separator, cardinality: 0..1)
 */
export interface ItemProps extends HTMLAttributes<HTMLLIElement> {
  /**
   * The link content (text or element)
   * Maps to DSL role: link (cardinality: 1, slotName: default)
   */
  children: ReactNode;
  /**
   * URL for the breadcrumb link
   */
  href?: string;
  /**
   * Whether this is the current/active breadcrumb
   * When true, renders as text instead of link
   */
  current?: boolean;
  /**
   * Custom separator character or element
   * Maps to DSL role: separator (cardinality: 0..1)
   * @default "/"
   */
  separator?: ReactNode;
}
