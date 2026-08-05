import { route } from "@canonical/router-core";
import { routeShortcutFacet } from "#lib/routeShortcut/index.js";
import { shellStripFacet } from "#lib/Shell/stripFacet.js";
import { ROUTE_QUERY_META_KEY } from "#relay/routeQuery.js";
import { warmRouteQuery } from "#relay/warmRouteQuery.js";
import { DefinitionsPage } from "./DefinitionsPage/index.js";
import { definitionsRouteEntry } from "./definitionsQuery.js";
import { definitionsStripSlots } from "./stripSlots.js";

/**
 * The Definitions lens routes (P-5): the explorer (`/definitions`, the
 * lens key the Rail links to) and the term view (`/definitions/:term`,
 * percent-encoded prefixed URI, e.g. `/definitions/ds%3AUIBlock`). Both
 * mount the same page over the same ONE `RouteQueryEntry`
 * (`definitionsQuery.ts`), parked twice per the P-2/P-5 handshake:
 *
 * - `meta[ROUTE_QUERY_META_KEY]` — the server prepare step POSTs the query
 *   to the graph server and serialises the reply into the store
 *   (`prepareRelayData`);
 * - `prefetch` — hover (router-react's `Link`) and the initial hydration
 *   load warm the client store through `warmRouteQuery`.
 *
 * Both routes claim ALL THREE mode-strip sockets (R5 — a toolbar and the
 * top bar should be useful): the context name, the filter chips, and the
 * status figure. The chips filter on the two axes an `OntologyClass`
 * genuinely carries — abstraction and owning ontology. They are NOT a
 * maturity lens: verified live, the ontology surface has no lifecycle,
 * status or channel field, and the `Tag` vocabulary that does carry a
 * channel facet applies to UIBlocks rather than ontology classes.
 *
 * Claiming the sockets deliberately loosened `frameStability.tests.tsx`,
 * which previously asserted both were empty on every URL; that change
 * landed in its own commit with its own justification.
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
      ...shellStripFacet.of({ ...definitionsStripSlots }),
      ...routeShortcutFacet.of("3"),
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
      ...shellStripFacet.of({ ...definitionsStripSlots }),
    },
  }),
} as const;

export default routes;
