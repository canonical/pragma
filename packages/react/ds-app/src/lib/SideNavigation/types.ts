import type { IconName } from "@canonical/ds-assets";
import type { Item } from "@canonical/ds-types";
// The custom-link contract is shared across every link-injecting component
// (cs:react.component.link_component); sourced from ds-global so SideNavigation,
// Breadcrumbs, and Tabs use one interface. Re-exported so this module's existing
// import sites (Content/Footer/NavTree/Item, the story harness) resolve it here.
import type { LinkComponentProps } from "@canonical/react-ds-global";
import type { ComponentType, HTMLAttributes, ReactNode } from "react";

export type { LinkComponentProps };

/**
 * The SideNavigation item — the WD405 `Item` enhanced with the presentational
 * extras this component understands:
 *
 * - `icon` — a leading icon (start slot), by ds-assets icon name.
 * - `slot` — trailing content for **leaf** items (end slot): a badge, count,
 *   etc. Ignored when the item has subitems — those show a disclosure caret
 *   automatically (`end = hasSubitems ? caret : slot`).
 *
 * No discriminated union to author: the caret-vs-slot choice is structural,
 * derived from whether the item has `items`.
 */
export interface NavItem extends Omit<Item, "items"> {
  /** Leading icon (start slot), by ds-assets icon name. */
  icon?: IconName;
  /** Trailing content for leaf items (end slot). Ignored if the item has subitems. */
  slot?: ReactNode;
  /** Subitems. Presence drives the disclosure caret (vs the leaf `slot`). */
  items?: NavItem[];
  /** CSS class name applied to this item's row, in addition to the base classes. */
  className?: string;
}

export interface SideNavigationProps extends HTMLAttributes<HTMLDivElement> {
  /** Brand content (logo/wordmark) rendered in the header. */
  brand?: ReactNode;
  /** Optional application name/wordmark shown beside the brand in the header. */
  applicationName?: ReactNode;
  /** Main navigation, as a root NavItem. Its direct children are rendered. */
  root?: NavItem;
  /** Footer navigation, as a root NavItem. Pinned to the bottom. */
  footerRoot?: NavItem;
  /**
   * Component used to render navigable items (those with a `url`). Receives
   * `LinkComponentProps`. Defaults to `"a"`. Pass a router `Link` (e.g.
   * `@canonical/router-react`) to integrate with client-side navigation.
   */
  LinkComponent?: ComponentType<LinkComponentProps> | "a";
  /**
   * Live current location, used to resolve which item is active. The matching
   * item is marked `aria-current` and its ancestor groups expanded. Keep it in
   * sync with the consumer's router (e.g. `useRoute().pathname`) so the active
   * state updates on navigation.
   */
  currentUrl?: string;
  /** Initial expanded (rail) state when uncontrolled. Defaults to `true`. */
  defaultExpanded?: boolean;
}
