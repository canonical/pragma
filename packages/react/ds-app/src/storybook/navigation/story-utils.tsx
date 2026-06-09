import { useRoute } from "@canonical/router-react";
import {
  withBaseLayer,
  withHashRouter,
} from "@canonical/storybook-addon-utils";
import type { Decorator } from "@storybook/react-vite";
import type { ReactNode } from "react";
import SideNavigation from "../../lib/SideNavigation/SideNavigation.js";
import type {
  LinkComponentProps,
  SideNavigationProps,
} from "../../lib/SideNavigation/types.js";

/**
 * Shared Storybook helpers for SideNavigation stories — the brand asset, the
 * router-aware Link adapter, and the standard decorators. Keeps the wiring in
 * one place so every story file passes the same comps to the component.
 */

/**
 * Canonical circle-of-friends mark (white, transparent), from Canonical's asset
 * CDN. External by design: the brand slot takes consumer-supplied content.
 */
const CANONICAL_LOGO = "https://assets.ubuntu.com/v1/82818827-CoF_white.svg";

export const Brand = (): ReactNode => (
  <a href="/" aria-label="Home">
    <img src={CANONICAL_LOGO} alt="Canonical" width={24} height={24} />
  </a>
);

/**
 * Link adapter for the stories. SideNavigation is router-agnostic (it only sees
 * `LinkComponentProps`); this bridges its raw-URL nav items to the hash router
 * provided by `withHashRouter` — `createHashRouter` reads `location.hash`, so an
 * href into the fragment navigates client-side with no server.
 */
export const HashLink = ({ href, ...props }: LinkComponentProps): ReactNode => (
  <a href={href ? `#${href}` : undefined} {...props} />
);

/** Standard decorators for SideNavigation stories: base surface + hash router. */
export const navDecorators: Decorator[] = [withBaseLayer, withHashRouter()];

/**
 * Mock Badge for stories — there is no real Badge component yet. Passed as a
 * leaf item's `slot` to exercise the Item end slot. Swap for the real component
 * once it lands.
 */
export const MockBadge = ({ children }: { children: ReactNode }): ReactNode => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minInlineSize: "1.25rem",
      paddingInline: "0.375rem",
      borderRadius: "0.625rem",
      fontSize: "0.75rem",
      lineHeight: 1.4,
      background: "rgb(0 0 0 / 0.25)",
    }}
  >
    {children}
  </span>
);

/**
 * Live SideNavigation for stories: subscribes to the router location via
 * `useRoute()` and feeds it as `currentUrl`, so clicking a HashLink updates the
 * active item — demonstrating the URL-driven active state in the canvas. This is
 * the consumer's job in a real app; the component itself stays router-agnostic.
 */
export const LiveSideNavigation = (
  props: Omit<SideNavigationProps, "currentUrl" | "LinkComponent">,
): ReactNode => {
  const { pathname } = useRoute();
  return (
    <SideNavigation {...props} currentUrl={pathname} LinkComponent={HashLink} />
  );
};
