import type { Item } from "@canonical/ds-types";
import type { ComponentType, HTMLAttributes, ReactNode } from "react";

/**
 * Props passed to custom Link components
 */
export interface LinkComponentProps {
  href?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * Props for the Breadcrumbs.Item subcomponent
 *
 * Extends navigation Item (WD405) with breadcrumb-specific props.
 *
 * @implements dso:global.subcomponent.breadcrumbs-item
 */
export interface ItemProps
  extends HTMLAttributes<HTMLLIElement>,
    // biome-ignore lint/suspicious/noExplicitAny: Component accepts any props
    Item<ComponentType<any>> {
  /**
   * The link content (text or element)
   * Falls back to `label` from Item if not provided
   */
  children?: ReactNode;
  /**
   * Whether this is the current/active breadcrumb
   * When true, renders as text instead of link
   */
  current?: boolean;
  /**
   * Custom separator character or element
   * @default "/"
   */
  separator?: ReactNode;
  /**
   * Custom link component for router integration
   * e.g. Next.js Link, React Router Link
   * @default "a"
   */
  LinkComponent?: ComponentType<LinkComponentProps> | "a";
}
