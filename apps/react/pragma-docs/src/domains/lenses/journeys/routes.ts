import { route } from "@canonical/router-core";
import { SHELL_STRIP_META_KEY } from "#lib/Shell/constants.js";
import type { StripSlotsEntry } from "#lib/Shell/types.js";
import { ROUTE_QUERY_META_KEY } from "#relay/routeQuery.js";
import { warmRouteQuery } from "#relay/warmRouteQuery.js";
import { JourneysPage } from "./JourneysPage/index.js";
import { journeysRouteEntry } from "./journeysQuery.js";
import { journeysStripSlots } from "./stripSlots.js";

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
 * Both routes claim the strip's `context` AND `controls` sockets (RULING
 * 1). The `controls` socket now holds the Table ⇄ Graph view switch — the
 * one instrument that is genuinely a strip-level toolbar: it chooses which
 * reading of the demand model the canvas shows, needs no explanatory caveat,
 * and its labels are data-independent, so the strip content is a stable
 * string. (The lens's OTHER controls — the coordinate chooser and the
 * persona filter — stay in the rail: each needs its own explanatory text
 * (the persona axis is APPROXIMATE and says so), and a strip toolbar is the
 * wrong place for a caveat that must be read.) The `status` socket stays
 * unclaimed — the lens has no single figure worth a live count.
 *
 * Claiming the `controls` socket deliberately loosened
 * `frameStability.tests.tsx`, which previously asserted the journeys
 * `controls` slot was empty; that change landed in its own commit with its
 * own justification, the same way the Definitions claim did.
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
        ...journeysStripSlots,
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
        ...journeysStripSlots,
      } satisfies StripSlotsEntry,
    },
  }),
} as const;

export default routes;
