import { useRoute } from "@canonical/router-react";
import {
  Lorem,
  withBaseLayer,
  withHashRouter,
} from "@canonical/storybook-addon-utils";
import type { Decorator } from "@storybook/react-vite";
import type { ReactNode } from "react";
import type { LinkComponentProps } from "../../lib/SideNavigation/types.js";
// The SideNavigation architecture tokens (--sidenav-*) used to ship globally
// via @canonical/styles/navigation.css; they now live on SideNavigation's own
// stylesheet. Import it here so standalone subcomponent stories (Header,
// Footer, Item, CanonicalLogo, …) resolve them without mounting the whole
// component.
import "../../lib/SideNavigation/styles.css";

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

// CanonicalLogo is generated (component/react) and re-exported here so stories
// keep importing brand helpers from one place.
export { CanonicalLogo } from "./CanonicalLogo/index.js";

/**
 * Link adapter for the stories. SideNavigation is router-agnostic (it only sees
 * `LinkComponentProps`); this bridges its raw-URL nav items to the hash router
 * that `withNavigationRouterProps` provides — the hash adapter reads
 * `location.hash`, so an href into the fragment navigates client-side with no
 * server.
 */
export const HashLink = ({ href, ...props }: LinkComponentProps): ReactNode => (
  <a href={href ? `#${href}` : undefined} {...props} />
);

/**
 * Standard decorators for SideNavigation stories: just the base `.surface`.
 * The hash router is owned by `withNavigationRouterProps` (self-contained), so
 * `navDecorators` must NOT also add `withHashRouter` — that would nest two
 * routers and register duplicate hash listeners.
 */
export const navDecorators: Decorator[] = [withBaseLayer];

/**
 * Provides the router-derived props to a nav story from the live location.
 *
 * Self-contained: composes addon-utils' `withHashRouter` around an inner
 * `useRoute()` bridge, so the provider wraps the hook regardless of
 * decorator order. The bridge injects `currentUrl` + `LinkComponent` via
 * the supported `Story({ args })` update and keys the story by pathname so
 * the navigation hook re-seeds its selection on navigation, while the
 * component stays router-agnostic. Use on SideNavigation / Content /
 * Footer; the story supplies only data (`root` / `footerRoot`).
 */
export const withNavigationRouterProps: Decorator = (Story, context) => {
  const RouterPropsBridge = (): ReactNode => {
    const { pathname } = useRoute();
    // Merge over the story's existing args explicitly (don't rely on SB's
    // update semantics) so `root`/`footerRoot` survive the injection.
    return (
      <Story
        key={pathname}
        args={{
          ...context.args,
          currentUrl: pathname,
          LinkComponent: HashLink,
        }}
      />
    );
  };
  return withHashRouter()(() => <RouterPropsBridge />);
};

/**
 * Wraps a subcomponent story in the SideNavigation root context
 * (`.ds.side-navigation`) so the shared row-inset custom properties and the
 * navigation surface tokens resolve — without it, Content/Footer/Header/Item
 * render unstyled in isolation (they consume CSS defined on the root).
 */
export const withSideNavShell: Decorator = (Story) => (
  <div className="ds side-navigation">
    <Story />
  </div>
);

/**
 * Imposes a page-like grid so the nav sits in a realistic context: a start
 * column matching the rail's own 240px width (SideNavigation sets its own
 * `inline-size` regardless; the matching column just avoids a dead gap)
 * with a placeholder main-content column filling the rest.
 */
export const withNavLayout: Decorator = (Story) => (
  <>
    <style>{`
      .app-shell-layout {
        display: grid;
        grid-template-columns: 1fr auto;
        grid-template-rows: 100dvh;
        gap: 1rem;
      }

      /* Switch to vertical stack on screens 768px or smaller */
      @media (max-width: 768px) {
        .app-shell-layout {
          grid-template-columns: 1fr;
          /* Assumes Story (nav) is on top, and main canvas is on bottom. 
             Swap to "1fr auto" if the nav should sit at the bottom of the screen. */
          grid-template-rows: auto 1fr; 
          height: 100dvh;
        }
      }
    `}</style>

    <div className="app-shell-layout">
      <Story />
      {/* The main canvas is its own scroll container so its content scrolls
          independently of the navigation, demonstrating the app-shell layout. */}
      {/* Inline padding only (side gutters); no block padding so the canvas
          content starts flush with the top and stays on the baseline grid. */}
      <main style={{ minHeight: 0, overflow: "auto", paddingInline: "1rem" }}>
        <Lorem paragraphs={8} />
      </main>
    </div>
  </>
);

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
      background: "var(--color-icon-warning-disabled)",
    }}
  >
    {children}
  </span>
);
