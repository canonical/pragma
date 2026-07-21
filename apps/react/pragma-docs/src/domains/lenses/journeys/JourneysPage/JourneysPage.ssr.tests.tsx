/**
 * The page renders its lens marker server-side even with no data, so a
 * cold render can never take the canvas down (the entry.tests precedent).
 */

import { HeadProvider } from "@canonical/react-head";
import { createStaticRouter } from "@canonical/router-core";
import { RouterProvider } from "@canonical/router-react";
import { renderToString } from "react-dom/server";
import { RelayEnvironmentProvider } from "react-relay";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import { createEnvironment } from "#relay/environment.js";
import { appRoutes, middleware, notFoundRoute } from "../../../../routes.js";
import JourneysPage from "./JourneysPage.js";

describe("JourneysPage SSR", () => {
  it("renders the lens marker and the fallback without throwing", () => {
    const fetchFn = vi.fn(() => new Promise<never>(() => {})) as ReturnType<
      typeof vi.fn
    > &
      FetchFunction;
    const html = renderToString(
      <HeadProvider>
        <RelayEnvironmentProvider
          environment={createEnvironment({ records: undefined, fetchFn })}
        >
          <RouterProvider
            router={createStaticRouter(appRoutes, "/journeys", {
              middleware: [...middleware],
              notFound: notFoundRoute,
            })}
          >
            <JourneysPage params={{}} />
          </RouterProvider>
        </RelayEnvironmentProvider>
      </HeadProvider>,
    );

    expect(html).toContain('id="lens-journeys-title"');
    expect(html).toContain('data-view="journeys"');
  });
});
