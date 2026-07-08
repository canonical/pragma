import type { Item } from "@canonical/ds-types";
import type { Snippet } from "svelte";
import type { SvelteHTMLElements } from "svelte/elements";

/**
 * Native anchor attributes, forwarded to the rendered link (or the
 * `<span>` standing in for it when current/disabled).
 * `href`, `class`, and `children` are modeled explicitly instead.
 */
export type ItemAnchorProps = Omit<
  SvelteHTMLElements["a"],
  "href" | "class" | "children"
>;

/**
 * Props for the Breadcrumbs.Item subcomponent
 *
 * Extends navigation Item (WD405) with breadcrumb-specific props.
 * Omits `items` (nested children): irrelevant to a flat breadcrumb trail.
 *
 * @implements dso:global.subcomponent.breadcrumbs-item
 */
export interface ItemProps extends ItemAnchorProps, Omit<Item, "items"> {
  /**
   * The link content (snippet)
   * Falls back to `label` from Item if not provided
   */
  children?: Snippet;
  /**
   * Whether this is the current/active breadcrumb
   * When true, renders as text instead of link
   */
  current?: boolean;
  /** CSS class applied to this item's `<li>`, in addition to the base classes. */
  class?: string;
  /**
   * Custom separator character or snippet
   * @default "/"
   */
  separator?: Snippet | string;
}
