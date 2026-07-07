import type { HTMLAttributes, ReactNode } from "react";
import type { LinkComponent } from "../../../../types/link.js";

/**
 * Props for the Tabs.Tab subcomponent
 *
 * @implements dso:global.subcomponent.tabs-tab
 */
export interface TabProps extends HTMLAttributes<HTMLLIElement> {
  /** The visible tab label. */
  children: ReactNode;
  /** Destination. When set, the tab renders through `LinkComponent`; when absent, as inert text. */
  href?: string;
  /** Whether this tab is the current location. Drives `aria-current="page"`. */
  active?: boolean;
  /** Class applied to the tab's link/text element (the `<li>` takes `className`). */
  linkClassName?: string;
  /**
   * Component used to render this tab when it is navigable (has an `href`).
   * Receives `LinkComponentProps`. Defaults to `"a"`. Pass a router `Link`
   * (e.g. `@canonical/router-react`) for client-side navigation. Each Tab is
   * self-contained — set this per tab (or spread it from your tab data).
   */
  LinkComponent?: LinkComponent;
}
