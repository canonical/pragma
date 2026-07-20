import { route } from "@canonical/router-core";
import { SHELL_STRIP_META_KEY } from "#lib/Shell/constants.js";
import type { StripSlotsEntry } from "#lib/Shell/types.js";
import { ROUTE_QUERY_META_KEY } from "#relay/routeQuery.js";
import { warmRouteQuery } from "#relay/warmRouteQuery.js";
import { DefinitionsPage } from "./DefinitionsPage/index.js";
import { definitionsRouteEntry } from "./definitionsQuery.js";

/**
 * The Definitions lens routes (P-5): the explorer (`/definitions`, the
 * lens key the Rail links to) and the term view (`/definitions/:term`,
 * percent-encoded prefixed URI, e.g. `/definitions/ds%3AUIBlock`). Both
 * mount the same page over the same ONE `RouteQueryEntry`
 * (`definitionsQuery.ts`), parked twice per the P-2/P-5 handshake:
 *
 * - `meta[ROUTE_QUERY_META_KEY]` — the server prepare step executes the
 *   query in-process and serialises the store (`prepareRelayData`);
 * - `prefetch` — hover (router-react's `Link`) and the initial hydration
 *   load warm the client store through `warmRouteQuery`.
 *
 * Both routes claim the mode strip's context socket ("Definitions").
 * Controls/status stay UNCLAIMED — honestly empty: the ontology surface
 * carries no governance/status fields to put there.
 */
const routes = {
  definitions: route({
    url: "/definitions",
    component: DefinitionsPage,
    prefetch: (params, search) => {
      warmRouteQuery(definitionsRouteEntry, params, search);
    },
    meta: {
      [ROUTE_QUERY_META_KEY]: definitionsRouteEntry,
      [SHELL_STRIP_META_KEY]: {
        context: "Definitions",
      } satisfies StripSlotsEntry,
    },
  }),
  definitionsTerm: route({
    url: "/definitions/:term",
    component: DefinitionsPage,
    prefetch: (params, search) => {
      warmRouteQuery(definitionsRouteEntry, params, search);
    },
    meta: {
      [ROUTE_QUERY_META_KEY]: definitionsRouteEntry,
      [SHELL_STRIP_META_KEY]: {
        context: "Definitions",
      } satisfies StripSlotsEntry,
    },
  }),
} as const;

export default routes;
