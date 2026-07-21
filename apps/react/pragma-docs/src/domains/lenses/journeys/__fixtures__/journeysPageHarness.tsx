/**
 * Shared harness for the Journeys lens's warm-store tests: the REAL
 * `JourneysPage` under the real provider stack — a seeded (or cold) Relay
 * environment, `HeadProvider`, and a static router over the REAL app routes
 * at the page's own URL, because the rail, the well's nodes and the
 * inspector all render router-react `Link`s whose hrefs (and `aria-current`
 * selection) must come from the actual `journeysJob` codec.
 *
 * The rail filter still lives inside the explorer's own `useState`. The VIEW
 * switch (RULING 1) does NOT: it moved to the mode strip's `controls` socket,
 * so its ephemeral state lives in `journeyViewContext` — a shell-spanning
 * provider, exactly like the Definitions lens's filter context. This harness
 * therefore wraps the page in `JourneyViewProvider` (as `routes.tsx` wraps
 * the Shell), so the view is writable on every real render; `journeysStrip`
 * below additionally mounts the strip's own switch under the SAME provider,
 * the way the Shell mounts it as a sibling of the canvas.
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
import { JourneyViewProvider } from "../journeyViewContext.js";
import { journeysStripSlots } from "../stripSlots.js";

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
        <JourneyViewProvider>
          <JourneysPage params={job === undefined ? {} : { job }} />
        </JourneyViewProvider>
      </RouterProvider>
    </RelayEnvironmentProvider>
  </HeadProvider>
);

/**
 * The page AND the strip's view switch under ONE `JourneyViewProvider` — the
 * production topology (RULING 1): the switch is mounted by the frame as a
 * sibling of the canvas, and context is the only path between them. Use this
 * when a test needs to drive the switch and observe the canvas react (the
 * interaction teeth). The strip tenant is mounted first, standing in for the
 * mode strip's `controls` socket.
 */
export const journeysStrip = (
  job: string | undefined,
  records: RecordMap | undefined,
  fetchFn: FetchFunction,
): ReactElement => {
  const { Controls } = journeysStripSlots;
  return (
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
          <JourneyViewProvider>
            <Controls />
            <JourneysPage params={job === undefined ? {} : { job }} />
          </JourneyViewProvider>
        </RouterProvider>
      </RelayEnvironmentProvider>
    </HeadProvider>
  );
};
