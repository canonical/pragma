import type { Item } from "@canonical/ds-types";
import type {
  ComponentType,
  HTMLAttributes,
  ReactElement,
  ReactNode,
} from "react";
import type { ItemProps, LinkComponentProps } from "./common/Item/types.js";

/**
 * Breadcrumb-specific item extending navigation Item (WD405)
 *
 * Adds breadcrumb-specific properties while maintaining
 * compatibility with the unified navigation type.
 */
// biome-ignore lint/suspicious/noExplicitAny: Component accepts any props
export interface BreadcrumbItem extends Item<ComponentType<any>> {
  /**
   * Whether this is the current page.
   * When true, renders as text instead of link.
   */
  current?: boolean;
}

/**
 * Props for the Breadcrumbs component
 *
 * @implements dso:global.pattern.breadcrumbs
 */
export interface BreadcrumbsProps extends HTMLAttributes<HTMLElement> {
  /**
   * Navigation items to display (WD405 Item type)
   * Each item is spread onto Breadcrumbs.Item or custom Component
   */
  items: BreadcrumbItem[];
  /**
   * Custom separator between items
   * @default "/"
   */
  separator?: ReactNode;
  /**
   * Custom link component for router integration
   * e.g. Next.js Link, React Router Link
   * Applied to all items unless overridden per-item
   * @default "a"
   */
  LinkComponent?: ComponentType<LinkComponentProps> | "a";
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

export type { LinkComponentProps };
