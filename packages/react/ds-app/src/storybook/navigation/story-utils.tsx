import { createHashRouter, route } from "@canonical/router-core";
import { RouterProvider, useRoute } from "@canonical/router-react";
import { Lorem, withBaseLayer } from "@canonical/storybook-addon-utils";
import type { Decorator } from "@storybook/react-vite";
import type { ReactNode } from "react";
import type { LinkComponentProps } from "../../lib/SideNavigation/types.js";

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
 * Canonical logo placeholder for the brand slot: a portrait brand-orange
 * rectangle (`--color-background-logo`) with the circle-of-friends mark anchored
 * at the bottom — a stand-in for the real Canonical logo while we align the
 * header rhythm. The rectangle fills the start column and the header's height,
 * so the CoF marks the header baseline at its foot.
 */
export const CanonicalLogo = (): ReactNode => (
  <a
    href="/"
    aria-label="Home"
    style={{
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      inlineSize: "var(--sidenav-start, 1.5rem)",
      blockSize: "100%",
      background: "var(--color-background-logo)",
      paddingBlockEnd: "var(--dimension-050, 0.25rem)",
    }}
  >
    <img src={CANONICAL_LOGO} alt="Canonical" width={16} height={16} />
  </a>
);

/**
 * Link adapter for the stories. SideNavigation is router-agnostic (it only sees
 * `LinkComponentProps`); this bridges its raw-URL nav items to the hash router
 * that `withNavigationRouterProps` provides — `createHashRouter` reads
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

/** Minimal catch-all route so the hash router has somewhere to resolve to. */
const navRoutes = { story: route({ url: "/", content: () => null }) } as const;

/**
 * Provides the router-derived props to a nav story from the live location.
 *
 * Self-contained: it renders its **own** `RouterProvider` (hash-based) around an
 * inner bridge that calls `useRoute()` — so the provider is guaranteed to wrap
 * the hook regardless of decorator order (no dependency on `withHashRouter`
 * being positioned correctly). The bridge injects `currentUrl` + `LinkComponent`
 * via the supported `Story({ args })` update and keys the story by pathname so
 * the navigation hook re-seeds its selection on navigation. Lets the component
 * stay router-agnostic while the story demonstrates URL-driven active state.
 * Use on SideNavigation / Content / Footer; the story supplies only data
 * (`root` / `footerRoot`).
 */
export const withNavigationRouterProps: Decorator = (Story, context) => {
  const router = createHashRouter(navRoutes);
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
  return (
    <RouterProvider router={router}>
      <RouterPropsBridge />
    </RouterProvider>
  );
};

/**
 * Wraps a subcomponent story in the SideNavigation root context
 * (`.ds.side-navigation`) so the shared row-grid custom property and the
 * navigation surface tokens resolve — without it, Content/Footer/Header/Item
 * render unstyled in isolation (they consume CSS defined on the root).
 */
export const withSideNavShell: Decorator = (Story) => (
  <div className="ds side-navigation">
    <Story />
  </div>
);

/**
 * Imposes a page-like grid so the nav is shown in a realistic context: the nav
 * sits in the start column (responsive — full width under ~300px, fixed 300px
 * above) with a placeholder main-content column filling the rest.
 */
export const withNavLayout: Decorator = (Story) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "300px auto",
      // The single row must be a DEFINITE height (not the default content-sized
      // `auto`), otherwise the row grows to fit the nav and the nav's
      // max-height:100% resolves against that grown height — no cap, no scroll.
      // Pinning the row to the viewport bounds both cells so the nav (Content)
      // and the main canvas each scroll internally.
      gridTemplateRows: "100dvh",
    }}
  >
    <Story />
    {/* The main canvas is its own scroll container so its content scrolls
        independently of the navigation, demonstrating the app-shell layout. */}
    <main style={{ minHeight: 0, overflow: "auto", padding: "1rem" }}>
      <Lorem paragraphs={8} />
    </main>
  </div>
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
      background: "rgb(0 0 0 / 0.25)",
    }}
  >
    {children}
  </span>
);
