/**
 * The rail's SSR posture: the full demand index renders to a string, so
 * the complete keyboard path through the lens exists before any client JS.
 */

import { createStaticRouter } from "@canonical/router-core";
import { RouterProvider } from "@canonical/router-react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { appRoutes, middleware, notFoundRoute } from "../../../../routes.js";
import {
  JOURNEY_MODEL,
  PERSONAS,
  ROLES_BY_COORDINATE,
} from "../__fixtures__/journeyModel.js";
import { ALL_JOURNEYS_FILTER } from "../journeyFilter.js";
import JourneyRail from "./JourneyRail.js";

describe("JourneyRail SSR", () => {
  it("renders the whole index, chips and caveat included", () => {
    const html = renderToString(
      <RouterProvider
        router={createStaticRouter(appRoutes, "/journeys", {
          middleware: [...middleware],
          notFound: notFoundRoute,
        })}
      >
        <JourneyRail
          coordinates={JOURNEY_MODEL}
          filter={ALL_JOURNEYS_FILTER}
          job={undefined}
          onFilterChange={() => {}}
          personas={PERSONAS}
          rolesByCoordinate={ROLES_BY_COORDINATE}
        />
      </RouterProvider>,
    );

    expect(html).toContain('data-slot="journeys-rail"');
    // Every job is a server-rendered link.
    expect(html).toContain("job.l3");
    expect(html).toContain("job.orphan");
    // The approximation caveat is in the server markup, not added later.
    expect(html).toContain("Approximate");
  });
});
