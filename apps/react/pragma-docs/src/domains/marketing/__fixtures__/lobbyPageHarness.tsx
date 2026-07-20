/**
 * Shared harness for the Home lobby's warm-store tests: the REAL page
 * under the real provider stack — Relay environment (seeded or cold),
 * `HeadProvider`, and a static router over the REAL app routes at `/`,
 * because the exemplar strip and every door render router-react `Link`s
 * whose hrefs must come from the actual route codecs (the exemplar links
 * round-trip the `componentEntity` codec, the D31 landing rule).
 *
 * Lives in `__fixtures__` beside the captured record map: imported by
 * tests, never collected as one. Mirrors `standardsPageHarness.tsx`.
 */

import { HeadProvider } from "@canonical/react-head";
import { createStaticRouter } from "@canonical/router-core";
import { RouterProvider } from "@canonical/router-react";
import type { ReactElement } from "react";
import { RelayEnvironmentProvider } from "react-relay";
import type { FetchFunction } from "relay-runtime";
import type { RecordMap } from "relay-runtime/store/RelayStoreTypes.js";
import { createEnvironment } from "#relay/environment.js";
import { appRoutes, middleware, notFoundRoute } from "../../../routes.js";
import HomePage from "../HomePage.js";

/**
 * The first exemplar the captured fixture serves — the graph's own
 * ordering puts it first, and the fixture freezes that.
 */
export const FIRST_EXEMPLAR_URI = "ds:global.component.accordion";

/** The same exemplar's display name. */
export const FIRST_EXEMPLAR_NAME = "Accordion";

/**
 * Contention insurance (the components lens's F3 precedent,
 * `catalogPageHarness.tsx`): these tests mount the full provider stack +
 * static router, which can overrun the 5s default under heavy parallel
 * machine load. Per-test only — the config default stands.
 */
export const LOBBY_TEST_TIMEOUT_MS = 15_000;

/**
 * The lobby over an environment seeded with `records` (`undefined` = cold
 * store). The page owns its Suspense/ErrorBoundary; the router exists for
 * `Link` context only (no Outlet — the Shell stays out of component
 * tests).
 */
export const lobbyPage = (
  records: RecordMap | undefined,
  fetchFn: FetchFunction,
): ReactElement => (
  <HeadProvider>
    <RelayEnvironmentProvider
      environment={createEnvironment({ records, fetchFn })}
    >
      <RouterProvider
        router={createStaticRouter(appRoutes, "/", {
          middleware: [...middleware],
          notFound: notFoundRoute,
        })}
      >
        <HomePage />
      </RouterProvider>
    </RelayEnvironmentProvider>
  </HeadProvider>
);
