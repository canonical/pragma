import { route } from "@canonical/router-core";
import { makeLensContext } from "#lib/LensBreadcrumbs/index.js";
import { SHELL_STRIP_META_KEY } from "#lib/Shell/constants.js";
import type { StripSlotsEntry } from "#lib/Shell/types.js";
import { ROUTE_QUERY_META_KEY } from "#relay/routeQuery.js";
import { warmRouteQuery } from "#relay/warmRouteQuery.js";
import { StandardReadingPage } from "./StandardReadingPage/index.js";
import { StandardsPage } from "./StandardsPage/index.js";
import { standardEntityRouteEntry } from "./standardEntityQuery.js";
import { standardsIndexRouteEntry } from "./standardsIndexQuery.js";

/**
 * The lens's mode-strip context tenant: the breadcrumb trail. `Standards`
 * on the index, `Standards / <uri>` on a reading page — the reading crumb
 * is the `:uri` route param (the prefixed URI, which the cs: surface speaks
 * natively), URL-derived, so the strip reads no query.
 */
const StandardsContext = makeLensContext({
  lensLabel: "Standards",
  lensRouteName: "standards",
  paramKey: "uri",
});

/**
 * The Standards lens routes (P-5): the category-grouped index
 * (`/standards`, the lens key the Rail links to) and the reading page
 * (`/standards/:uri`, percent-encoded prefixed URI, e.g.
 * `/standards/cs%3Acode.array.safe_access` — the D31 address
 * `resolveChipHref` derives for `standard` mentions, pinned round-trip in
 * `routeQueries.tests.ts`). Each data-bearing route builds its
 * `RouteQueryEntry` ONCE (in its query module) and parks it twice per the
 * P-2/P-5 handshake:
 *
 * - `meta[ROUTE_QUERY_META_KEY]` — the server prepare step executes the
 *   query in-process and serialises the store (`prepareRelayData`);
 * - `prefetch` — hover (router-react's `Link`) and the initial hydration
 *   load warm the client store through `warmRouteQuery`.
 *
 * Both routes claim the mode strip's context socket ("Standards") — the
 * lens name, stationary across the lens's URLs. Controls/status stay
 * UNCLAIMED — honestly empty: the cs: surface carries no filter controls
 * (v1) and no governance/status fields to put there.
 */
const routes = {
  standards: route({
    url: "/standards",
    component: StandardsPage,
    prefetch: (params, search) => {
      warmRouteQuery(standardsIndexRouteEntry, params, search);
    },
    meta: {
      [ROUTE_QUERY_META_KEY]: standardsIndexRouteEntry,
      [SHELL_STRIP_META_KEY]: {
        Context: StandardsContext,
      } satisfies StripSlotsEntry,
    },
  }),
  standardEntity: route({
    url: "/standards/:uri",
    component: StandardReadingPage,
    prefetch: (params, search) => {
      warmRouteQuery(standardEntityRouteEntry, params, search);
    },
    meta: {
      [ROUTE_QUERY_META_KEY]: standardEntityRouteEntry,
      [SHELL_STRIP_META_KEY]: {
        Context: StandardsContext,
      } satisfies StripSlotsEntry,
    },
  }),
} as const;

export default routes;
