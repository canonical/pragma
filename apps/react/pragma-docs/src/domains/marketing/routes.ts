import { route } from "@canonical/router-core";
import { makeLensContext } from "#lib/LensBreadcrumbs/index.js";
import { SHELL_STRIP_META_KEY } from "#lib/Shell/constants.js";
import type { StripSlotsEntry } from "#lib/Shell/types.js";
import { ROUTE_QUERY_META_KEY } from "#relay/routeQuery.js";
import { warmRouteQuery } from "#relay/warmRouteQuery.js";
import GuidePage from "./GuidePage.js";
import HomePage from "./HomePage.js";
import { lobbyRouteEntry } from "./lobbyQuery.js";

/**
 * The lobby's mode-strip context tenant: a single `Home` crumb (the lens
 * name as the Rail's `LENS_ENTRIES` labels it). The lobby has one address,
 * so there is no terminal crumb and no route param to read — the lens crumb
 * IS the current page.
 */
const HomeContext = makeLensContext({
  lensLabel: "Home",
  lensRouteName: "home",
});

/**
 * The marketing routes: the Home lobby (`/`, AV-350 — the front door, and
 * the last route to come over the graph) and the guide reading detail
 * (`/guides/:slug`, which stays a plain authored page — it has no graph
 * query yet).
 *
 * The lobby builds its `RouteQueryEntry` ONCE (in `lobbyQuery.ts`) and
 * parks it twice per the P-2/P-5 handshake:
 *
 * - `meta[ROUTE_QUERY_META_KEY]` — the server prepare step executes the
 *   query in-process and serialises the store (`prepareRelayData`);
 * - `prefetch` — hover (router-react's `Link`) and the initial hydration
 *   load warm the client store through `warmRouteQuery`.
 *
 * The lobby claims the mode strip's context socket with "Home" — the lens
 * name as the Rail's `LENS_ENTRIES` labels it, matching how every other
 * lens claims its own name. Controls/status stay UNCLAIMED — honestly
 * empty: the lobby has no filters and no status to report.
 */
const routes = {
  home: route({
    url: "/",
    component: HomePage,
    prefetch: (params, search) => {
      warmRouteQuery(lobbyRouteEntry, params, search);
    },
    meta: {
      [ROUTE_QUERY_META_KEY]: lobbyRouteEntry,
      [SHELL_STRIP_META_KEY]: {
        Context: HomeContext,
      } satisfies StripSlotsEntry,
    },
  }),
  guide: route({
    url: "/guides/:slug",
    component: GuidePage,
  }),
} as const;

export default routes;
