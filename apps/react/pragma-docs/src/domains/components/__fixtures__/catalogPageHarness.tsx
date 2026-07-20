/**
 * Shared harness for the catalog's warm-store tests: the REAL
 * `ComponentsCatalogPage` under the real provider stack — Relay
 * environment (seeded or cold), `HeadProvider`, and a static router over
 * the REAL app routes, because catalog cards render router-react `Link`s
 * whose hrefs must come from the actual `componentEntity` codec.
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
import { appRoutes, middleware, notFoundRoute } from "../../../routes.js";
import { ComponentsCatalogPage } from "../ComponentsCatalogPage/index.js";

/**
 * The catalog page over an environment seeded with `records` (`undefined`
 * = cold store). The page owns its Suspense/ErrorBoundary; the router
 * exists for `Link` context only (no Outlet — the Shell stays out of
 * component tests).
 */
export const catalogPage = (
  records: RecordMap | undefined,
  fetchFn: FetchFunction,
): ReactElement => (
  <HeadProvider>
    <RelayEnvironmentProvider
      environment={createEnvironment({ records, fetchFn })}
    >
      <RouterProvider
        router={createStaticRouter(appRoutes, "/components", {
          middleware: [...middleware],
          notFound: notFoundRoute,
        })}
      >
        <ComponentsCatalogPage />
      </RouterProvider>
    </RelayEnvironmentProvider>
  </HeadProvider>
);
