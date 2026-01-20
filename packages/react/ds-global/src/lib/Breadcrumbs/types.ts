import type { HTMLAttributes, ReactElement } from "react";
import type { ItemProps } from "./common/Item/types.js";

/**
 * Props for the Breadcrumbs component
 *
 * @implements dso:global.pattern.breadcrumbs
 *
 * Anatomy (from DSL):
 * - layout.type: flow
 * - layout.direction: horizontal
 * - layout.align: center
 * - edges:
 *   - [0] breadcrumbs-item (cardinality: 1..*, slotName: default)
 */
export interface BreadcrumbsProps extends HTMLAttributes<HTMLElement> {
  /**
   * Breadcrumbs.Item elements
   * Maps to DSL cardinality: 1..* (one or more required)
   */
  children: ReactElement<ItemProps> | ReactElement<ItemProps>[];
  /**
   * Accessible label for the navigation landmark
   * @default "Breadcrumb"
   */
  "aria-label"?: string;
}

/**
 * Breadcrumbs component type with attached subcomponents
 */
export type BreadcrumbsComponent = ((
  props: BreadcrumbsProps,
) => ReactElement) & {
  Item: (props: ItemProps) => ReactElement;
};
