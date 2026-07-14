import type { Item } from "@canonical/ds-types";
import type { Snippet } from "svelte";
import type { ClassValue, SvelteHTMLElements } from "svelte/elements";
import type { ItemAnchorProps } from "./common/Item/types.js";

/**
 * Breadcrumb-specific item extending navigation Item (WD405)
 *
 * Adds breadcrumb-specific properties while maintaining
 * compatibility with the unified navigation type.
 *
 * Extends the native anchor attributes directly (`target`,
 * `data-sveltekit-*`, event handlers, ...) so router integration is a
 * matter of setting attributes on the item, not swapping in a custom
 * link component.
 *
 * Omits `items` (nested children) from the shared Item type: breadcrumbs
 * are always a flat trail, so that field has no meaning here.
 */
export interface BreadcrumbItem extends ItemAnchorProps, Omit<Item, "items"> {
  /**
   * Whether this is the current page.
   * When true, renders as text instead of link.
   */
  current?: boolean;
  /** CSS class applied to this item's `<li>`, in addition to the base classes. */
  class?: ClassValue;
}

type BaseProps = SvelteHTMLElements["nav"];

/**
 * Props for the Breadcrumbs component
 *
 * @implements dso:global.pattern.breadcrumbs
 */
export interface BreadcrumbsProps extends BaseProps {
  /**
   * Navigation items to display (WD405 Item type)
   * Each item is rendered by Breadcrumbs.Item, unless `render` is provided.
   */
  items: BreadcrumbItem[];
  /**
   * Custom renderer for every item, replacing the default `Breadcrumbs.Item`.
   * Called once per item; branch inside the snippet (e.g. on `current`) for
   * per-segment variation.
   */
  render?: Snippet<[BreadcrumbItem]>;
  /**
   * Custom separator between items
   * @default "/"
   */
  separator?: Snippet | string;
  /**
   * Accessible label for the navigation landmark
   * @default "Breadcrumb"
   */
  "aria-label"?: string;
}
