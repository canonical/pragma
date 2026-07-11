import type { Item } from "@canonical/ds-types";
import type { ComponentType, HTMLAttributes, ReactNode } from "react";
// The custom-link contract is shared across every link-injecting component
// (cs:react.component.link_component). Re-exported here so existing import sites
// (Breadcrumbs/types.ts) keep resolving it from this module unchanged.
import type { LinkComponentProps } from "../../../../types/link.js";

export type { LinkComponentProps };

/**
 * Props for the Breadcrumbs.Item subcomponent
 *
 * Extends navigation Item (WD405) with breadcrumb-specific props.
 *
 * @implements dso:global.subcomponent.breadcrumbs-item
 */
export interface ItemProps extends HTMLAttributes<HTMLLIElement>, Item {
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
   *
   * @remarks
   * For external (non-Canonical) products only. Not designed/approved for
   * Canonical products; Canonical products must use the default "/"
   * separator.
   * @default "/"
   */
  separator?: ReactNode;
  /**
   * Custom link component for router integration
   * e.g. Next.js Link, React Router Link
   * @default "a"
   */
  LinkComponent?: ComponentType<LinkComponentProps> | "a";
  /**
   * Custom component for rendering this item itself.
   * e.g. A specialized renderer for complex items.
   */
  // biome-ignore lint/suspicious/noExplicitAny: Component accepts any props
  Component?: ComponentType<any>;
}
