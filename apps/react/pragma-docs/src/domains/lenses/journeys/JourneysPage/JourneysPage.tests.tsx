/**
 * The page's own contract: the static lens marker stands OUTSIDE the
 * boundaries (the frame suite keys the journeys canvas off it), and the
 * interior suspends without taking the marker with it.
 */

import "../../definitions/__fixtures__/stubReactFlowGlobals.js";
import { HeadProvider } from "@canonical/react-head";
import { createStaticRouter } from "@canonical/router-core";
import { RouterProvider } from "@canonical/router-react";
import { render, screen } from "@testing-library/react";
import { RelayEnvironmentProvider } from "react-relay";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import { createEnvironment } from "#relay/environment.js";
import { appRoutes, middleware, notFoundRoute } from "../../../../routes.js";
import JourneysPage from "./JourneysPage.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

describe("JourneysPage", () => {
  it("keeps its lens marker while the interior suspends on a cold store", () => {
    const fetchFn = createFetchSpy();
    render(
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

    expect(
      screen.getByRole("heading", { level: 1, name: "Journeys" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Loading the demand model…")).toBeInTheDocument();
    // A cold store fetches exactly the one route operation.
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
