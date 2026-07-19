/**
 * The client hydration seam (P-2 Stage 1): read the SSR-embedded
 * `__INITIAL_DATA__` off `window`, seed the Relay environment from its
 * serialised records, and hydrate the app tree over the server HTML.
 * Extracted from `entry.tsx` (which calls it once at module scope) so tests
 * can drive the REAL seeding logic — the "hydration never refetches what the
 * server already serialised" guarantee lives on this exact read chain.
 */

import { HeadProvider } from "@canonical/react-head";
import { createBrowserRouter } from "@canonical/router-core";
import { Outlet, RouterProvider } from "@canonical/router-react";
import {
  type HydrationOptions,
  hydrateRoot,
  type Root,
} from "react-dom/client";
import { RelayEnvironmentProvider } from "react-relay";
import { createEnvironment } from "#relay/environment.js";
import { setPrefetchEnvironment } from "#relay/prefetchEnvironment.js";
import { appRoutes, middleware, notFoundRoute } from "../routes.js";
import type { InitialData } from "../server/entry.js";

/**
 * Hydrate the app into `container`, returning the created root.
 *
 * The SSR servers embed `__INITIAL_DATA__` via the renderer's bootstrap
 * script, which executes before any module script (those are deferred). The
 * two SPA cells have no such global at all — hence every step of the read
 * chain below is optional.
 *
 * One Relay environment (network + normalized store) for the whole browser
 * session — created once here, so client-side navigations share the cache.
 * Seeded from the server-serialised records, so the hydration render reads
 * the same bytes the server rendered from and nothing refetches.
 *
 * `options` passes through to `hydrateRoot`: production sends none; tests
 * send `onRecoverableError` to assert mismatch-free hydration.
 */
export const hydrateApp = (
  container: Element | Document,
  options?: HydrationOptions,
): Root => {
  const initialData = (
    window as Window & { readonly __INITIAL_DATA__?: InitialData }
  ).__INITIAL_DATA__;

  const relayEnvironment = createEnvironment({
    records: initialData?.relay?.records,
  });

  // Publish the environment for route prefetch hooks BEFORE the router
  // exists: creating the browser router fires an initial `performLoad`,
  // whose prefetch hooks must already see the seeded store (warmRouteQuery's
  // `check` guard is what keeps that initial pass network-silent).
  setPrefetchEnvironment(relayEnvironment);

  const router = createBrowserRouter(appRoutes, {
    middleware: [...middleware],
    notFound: notFoundRoute,
  });

  return hydrateRoot(
    container,
    <HeadProvider>
      <RelayEnvironmentProvider environment={relayEnvironment}>
        <RouterProvider router={router}>
          <Outlet fallback={<p>Loading…</p>} />
        </RouterProvider>
      </RelayEnvironmentProvider>
    </HeadProvider>,
    options,
  );
};
