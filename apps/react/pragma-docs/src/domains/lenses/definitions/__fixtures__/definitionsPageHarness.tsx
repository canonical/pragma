/**
 * Shared harness for the Definitions lens's warm-store tests: the REAL
 * `DefinitionsPage` under the real provider stack — Relay environment
 * (seeded or cold), `HeadProvider`, and a static router over the REAL app
 * routes at the page's own URL, because the rail, the well's nodes, and
 * the inspector all render router-react `Link`s whose hrefs (and
 * `aria-current` selection) must come from the actual `definitionsTerm`
 * codec.
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
import { DefinitionsPage } from "../DefinitionsPage/index.js";

/** The primary exemplar the captured fixture serves. */
export const UIBLOCK_TERM = "ds:UIBlock";
/** The property-term exemplar (`definitionsExplorerRecordsProperty`). */
export const PROPERTY_TERM = "ds:hasSubcomponent";

/**
 * Contention insurance (the components lens's F3 precedent,
 * `catalogPageHarness.tsx`): these tests mount the full provider stack +
 * static router + React Flow, which can overrun the 5s default under
 * heavy parallel machine load. Per-test only — the config default stands.
 */
export const DEFINITIONS_TEST_TIMEOUT_MS = 20_000;

/**
 * The definitions page at `term` (undefined = the `/definitions`
 * explorer) over an environment seeded with `records` (`undefined` = cold
 * store). The page owns its Suspense/ErrorBoundary; the router exists for
 * `Link` context and selection only (no Outlet — the Shell stays out of
 * component tests).
 */
export const definitionsPageAt = (
  term: string | undefined,
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
          term === undefined
            ? "/definitions"
            : appRoutes.definitionsTerm.render({ term }),
          {
            middleware: [...middleware],
            notFound: notFoundRoute,
          },
        )}
      >
        <DefinitionsPage params={term === undefined ? {} : { term }} />
      </RouterProvider>
    </RelayEnvironmentProvider>
  </HeadProvider>
);
