import { route } from "@canonical/router-core";
import { SHELL_STRIP_META_KEY } from "#lib/Shell/constants.js";
import type { StripSlotsEntry } from "#lib/Shell/types.js";
import { ROUTE_QUERY_META_KEY } from "#relay/routeQuery.js";
import { warmRouteQuery } from "#relay/warmRouteQuery.js";
import { JourneysPage } from "./JourneysPage/index.js";
import { journeysRouteEntry } from "./journeysQuery.js";

/**
 * The Journeys lens routes (AV-351): the diagram (`/journeys`, the lens
 * key the Rail links to) and the job view (`/journeys/:job`,
 * percent-encoded graph URI). Both mount the same page over the same ONE
 * `RouteQueryEntry` (`journeysQuery.ts`), parked twice per the P-2/P-5
 * handshake:
 *
 * - `meta[ROUTE_QUERY_META_KEY]` — the server prepare step executes the
 *   query in-process and serialises the store (`prepareRelayData`);
 * - `prefetch` — hover (router-react's `Link`) and the initial hydration
 *   load warm the client store through `warmRouteQuery`.
 *
 * THE JOB IS THE ADDRESSABLE THING (P-D7). A journey is a job's path
 * through the surfaces that serve it, so the job is what a reader links
 * to, cites and returns to. The COORDINATE roots the diagram (ruling R1)
 * but is a way of looking, not a place — it lives in the lens's ephemeral
 * filter, never in the URL.
 *
 * Both routes claim the strip's `context` socket only. The lens's controls
 * genuinely belong in the rail: the coordinate chooser and the persona
 * filter each need their own explanatory text (the persona axis is
 * APPROXIMATE and says so), and a strip toolbar is the wrong place for a
 * caveat that must be read. Claiming a socket to fill it would be
 * furniture pretending to be an instrument — the opposite of R5's point.
 */
const routes = {
  journeys: route({
    url: "/journeys",
    component: JourneysPage,
    prefetch: (params, search) => {
      warmRouteQuery(journeysRouteEntry, params, search);
    },
    meta: {
      [ROUTE_QUERY_META_KEY]: journeysRouteEntry,
      [SHELL_STRIP_META_KEY]: {
        context: "Journeys",
      } satisfies StripSlotsEntry,
    },
  }),
  journeysJob: route({
    url: "/journeys/:job",
    component: JourneysPage,
    prefetch: (params, search) => {
      warmRouteQuery(journeysRouteEntry, params, search);
    },
    meta: {
      [ROUTE_QUERY_META_KEY]: journeysRouteEntry,
      [SHELL_STRIP_META_KEY]: {
        context: "Journeys",
      } satisfies StripSlotsEntry,
    },
  }),
} as const;

export default routes;
