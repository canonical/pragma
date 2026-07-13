import type { Item } from "@canonical/ds-types";
import type { HTMLAttributes } from "react";
import type { LinkComponent } from "../../types/link.js";

/**
 * A tab, as a WD405 navigation `Item`. A tab strip is flat, so only the
 * top-level fields are used: `url` (destination — a tab without one is inert),
 * `label` (visible text), `key` (identity when there is no url), and
 * `disabled`. Nested `items` are ignored (tabs cannot nest).
 */
export interface TabItem extends Item {
  /** CSS class name applied to this tab's `<li>`, in addition to the base classes. */
  className?: string;
}

/**
 * Props for the Tabs component
 *
 * @implements dso:global.component.tabs
 */
export interface TabsProps extends HTMLAttributes<HTMLElement> {
  /**
   * The tab strip, as a root navigation `Item`. Its **direct children**
   * (`navigationRoot.items`) are rendered as tabs; the root node itself is a
   * container and is not rendered.
   */
  navigationRoot: TabItem;
  /**
   * Component used to render navigable tabs (those with a `url`). Receives
   * `LinkComponentProps`. Defaults to `"a"`. Pass a router `Link` (e.g.
   * `@canonical/router-react`) to integrate with client-side navigation.
   */
  LinkComponent?: LinkComponent;
  /**
   * Live current location, used to resolve which tab is active. The tab whose
   * `url` matches is marked `aria-current`. Keep it in sync with the consumer's
   * router (e.g. `useRoute().pathname`) so the active tab updates on navigation.
   */
  currentUrl?: string;
  /** Class applied to the `<ul>` tab list. */
  listClassName?: string;
  /**
   * Accessible name for the navigation landmark. Required so assistive tech can
   * distinguish this tab strip from other navigation regions.
   */
  "aria-label": string;
}
