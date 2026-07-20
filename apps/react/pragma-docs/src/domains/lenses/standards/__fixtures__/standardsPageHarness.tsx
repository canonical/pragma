/**
 * Shared harness for the Standards lens's warm-store tests: the REAL
 * pages under the real provider stack — Relay environment (seeded or
 * cold), `HeadProvider`, and a static router over the REAL app routes at
 * the page's own URL, because the index's standard links, the article's
 * `extends` links, and the breadcrumb all render router-react `Link`s
 * whose hrefs must come from the actual `standards`/`standardEntity`
 * codecs.
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
import { StandardReadingPage } from "../StandardReadingPage/index.js";
import { StandardsPage } from "../StandardsPage/index.js";

/** The reading exemplar the captured entity fixture serves. */
export const LINK_COMPONENT_URI = "cs:react.component.link_component";

/** The exemplar's one `extends` target (a live standard). */
export const LINK_COMPONENT_EXTENDS_URI = "cs:react.component.props";

/**
 * Contention insurance (the components lens's F3 precedent,
 * `catalogPageHarness.tsx`): these tests mount the full provider stack +
 * static router, which can overrun the 5s default under heavy parallel
 * machine load. Per-test only — the config default stands.
 */
export const STANDARDS_TEST_TIMEOUT_MS = 15_000;

const providerStack = (
  url: string,
  records: RecordMap | undefined,
  fetchFn: FetchFunction,
  page: ReactElement,
): ReactElement => (
  <HeadProvider>
    <RelayEnvironmentProvider
      environment={createEnvironment({ records, fetchFn })}
    >
      <RouterProvider
        router={createStaticRouter(appRoutes, url, {
          middleware: [...middleware],
          notFound: notFoundRoute,
        })}
      >
        {page}
      </RouterProvider>
    </RelayEnvironmentProvider>
  </HeadProvider>
);

/**
 * The standards index page over an environment seeded with `records`
 * (`undefined` = cold store). The page owns its Suspense/ErrorBoundary;
 * the router exists for `Link` context only (no Outlet — the Shell stays
 * out of component tests).
 */
export const standardsIndexPage = (
  records: RecordMap | undefined,
  fetchFn: FetchFunction,
): ReactElement =>
  providerStack("/standards", records, fetchFn, <StandardsPage />);

/**
 * The reading page at `uri` over an environment seeded with `records`
 * (`undefined` = cold store). The router mounts at the page's own URL so
 * link selection matches production.
 */
export const standardReadingPageAt = (
  uri: string,
  records: RecordMap | undefined,
  fetchFn: FetchFunction,
): ReactElement =>
  providerStack(
    appRoutes.standardEntity.render({ uri }),
    records,
    fetchFn,
    <StandardReadingPage params={{ uri }} />,
  );
