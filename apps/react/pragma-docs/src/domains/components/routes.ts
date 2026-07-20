import { route } from "@canonical/router-core";
import { SHELL_STRIP_META_KEY } from "#lib/Shell/constants.js";
import type { StripSlotsEntry } from "#lib/Shell/types.js";
import { ROUTE_QUERY_META_KEY } from "#relay/routeQuery.js";
import { warmRouteQuery } from "#relay/warmRouteQuery.js";
import { ComponentEntityPage } from "./ComponentEntityPage/index.js";
import { ComponentsCatalogPage } from "./ComponentsCatalogPage/index.js";
import { componentsCatalogRouteEntry } from "./catalogQuery.js";
import { componentEntityRouteEntry } from "./entityQuery.js";

/**
 * The Components lens routes (P-5). Each data-bearing route builds its
 * `RouteQueryEntry` ONCE (in its query module) and parks it twice:
 *
 * - `meta[ROUTE_QUERY_META_KEY]` — the server prepare step executes the
 *   query in-process and serialises the store (P-2, `prepareRelayData`);
 * - `prefetch` — hover (router-react's `Link`) and the initial hydration
 *   load warm the client store through `warmRouteQuery`, which no-ops
 *   without a published environment (SSR) and when the store already
 *   fulfils the operation (the freshly hydrated page).
 *
 * Both routes claim the mode strip's context socket ("Components") — the
 * lens name, stationary across the lens's URLs; controls/status stay
 * unclaimed in v1.
 */
const routes = {
  components: route({
    url: "/components",
    content: ComponentsCatalogPage,
    prefetch: (params, search) => {
      warmRouteQuery(componentsCatalogRouteEntry, params, search);
    },
    meta: {
      [ROUTE_QUERY_META_KEY]: componentsCatalogRouteEntry,
      [SHELL_STRIP_META_KEY]: {
        context: "Components",
      } satisfies StripSlotsEntry,
    },
  }),
  componentEntity: route({
    url: "/components/:uri",
    content: ComponentEntityPage,
    prefetch: (params, search) => {
      warmRouteQuery(componentEntityRouteEntry, params, search);
    },
    meta: {
      [ROUTE_QUERY_META_KEY]: componentEntityRouteEntry,
      [SHELL_STRIP_META_KEY]: {
        context: "Components",
      } satisfies StripSlotsEntry,
    },
  }),
} as const;

export default routes;
