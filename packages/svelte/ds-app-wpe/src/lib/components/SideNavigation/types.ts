import type { Item } from "@canonical/ds-types";
import type { Snippet } from "svelte";
import type { ClassValue, SvelteHTMLElements } from "svelte/elements";

/**
 * The SideNavigation item — the WD405 `Item` enhanced with the presentational
 * extras this component understands.
 *
 * `root` and `footerRoot` are always a `root -> group -> item(-> subitem)`
 * tree: the root item's direct `items` are rendered as groups (an optional
 * `label` heading over a list of items), never as focusable rows themselves.
 * A flat, ungrouped list is simply one group with no `label`.
 *
 * An item with its own `items` (a group's direct child) renders as an
 * expandable row with a disclosure caret instead of the leading `icon`/
 * trailing `slot`; its `items` become the subitems shown when expanded.
 * Subitems cannot themselves have further children (matches the design
 * spec — expandable items are exactly one level deep).
 */
export interface NavItem extends Omit<Item, "items"> {
  /** Leading icon (start slot). */
  icon?: Snippet<[]>;
  /** Trailing content for leaf items (end slot): a badge, count, etc. Ignored when the item has subitems — those show a disclosure caret automatically. */
  slot?: Snippet<[]>;
  /** Subitems (or, for the root item, groups). Presence on a non-root item drives the disclosure caret. */
  items?: NavItem[];
  /** CSS class applied to this item's row, in addition to the base classes. */
  class?: ClassValue;
}

type BaseProps = SvelteHTMLElements["nav"];

export interface SideNavigationProps extends BaseProps {
  /**
   * Brand content (logo/wordmark) rendered at the start of the header.
   * Receives `expanded` so the brand can swap a full wordmark for an
   * icon-only mark while the rail is collapsed.
   */
  brand?: Snippet<[{ expanded: boolean }]>;
  /** Optional application name/wordmark shown beside the brand in the header. */
  applicationName?: Snippet<[]>;
  /** Main navigation, as a root NavItem. Its direct children are rendered as groups. */
  root?: NavItem;
  /**
   * Footer navigation, as a root NavItem. Pinned to the bottom and shown
   * (icon-only) even while the rail is collapsed.
   */
  footerRoot?: NavItem;
  /**
   * Live current location, used to resolve which item is active. The
   * matching item is marked `aria-current="page"` and its ancestor groups
   * (and expandable ancestors) opened. Keep it in sync with the consumer's
   * router (e.g. the current pathname) so the active state updates on
   * navigation.
   */
  currentUrl?: string;
  /**
   * Whether the side navigation is expanded (showing labels and the main
   * content region) or collapsed to an icon rail. Bindable — pass `bind:expanded`
   * to control it, or omit the binding to let the component own the state.
   *
   * @default true
   */
  expanded?: boolean;
  /**
   * Accessible name for the navigation landmark.
   * @default "Main navigation"
   */
  "aria-label"?: string;
}
