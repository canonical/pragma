/**
 * Shared harness for the Journeys lens's warm-store tests: the REAL
 * `JourneysPage` under the real provider stack — a seeded (or cold) Relay
 * environment, `HeadProvider`, and a static router over the REAL app routes
 * at the page's own URL, because the rail, the well's nodes and the
 * inspector all render router-react `Link`s whose hrefs (and `aria-current`
 * selection) must come from the actual `journeysJob` codec.
 *
 * Unlike the definitions harness there is NO filter-context provider: the
 * journeys lens's ephemeral state (the rail filter and — FIX 2 — the view
 * switch) lives inside the explorer's own `useState`, not a shell-spanning
 * context, so the page mounts directly.
 *
 * Lives in `__fixtures__` beside the captured record maps: imported by
 * tests, never collected as one.
 */

import { HeadProvider } from "@canonical/react-head";
import { createStaticRouter } from "@canonical/router-core";
import { RouterProvider } from "@canonical/router-react";
import type { ReactElement } from "react";
import { RelayEnvironmentProvider } from "react-relay";
import type { FetchFunction } from "relay-runtime";
import type { RecordMap } from "relay-runtime/store/RelayStoreTypes.js";
import { createEnvironment } from "#relay/environment.js";
import { appRoutes, middleware, notFoundRoute } from "../../../../routes.js";
import { JourneysPage } from "../JourneysPage/index.js";

/**
 * Contention insurance (the definitions/components precedent): these tests
 * mount the full provider stack + static router + React Flow, which can
 * overrun the 5s default under heavy parallel machine load. Per-test only —
 * the config default stands.
 */
export const JOURNEYS_TEST_TIMEOUT_MS = 20_000;

/**
 * The journeys page at `job` (undefined = the `/journeys` index) over an
 * environment seeded with `records` (`undefined` = cold store). The page
 * owns its Suspense/ErrorBoundary; the router exists for `Link` context and
 * selection only (no Outlet — the Shell stays out of component tests).
 */
export const journeysPageAt = (
  job: string | undefined,
  records: RecordMap | undefined,
  fetchFn: FetchFunction,
): ReactElement => (
  <HeadProvider>
    <RelayEnvironmentProvider
      environment={createEnvironment({ records, fetchFn })}
    >
      <RouterProvider
        router={createStaticRouter(
          appRoutes,
          job === undefined
            ? "/journeys"
            : appRoutes.journeysJob.render({ job }),
          {
            middleware: [...middleware],
            notFound: notFoundRoute,
          },
        )}
      >
        <JourneysPage params={job === undefined ? {} : { job }} />
      </RouterProvider>
    </RelayEnvironmentProvider>
  </HeadProvider>
);
