/**
 * The route→query collector: maps route name → the server-executable query
 * entry each route parks on its `meta` (P-2 D3).
 *
 * The server bricks import `appRoutes` natively through this module and run
 * their own static match — a deliberate double-match (one here for data, one
 * in `EntryServer` for render). In the dev servers these route objects live
 * in a different module registry than `EntryServer`'s (native vs
 * `ssrLoadModule`), which is safe for matching and for reading values off
 * `meta`: the entries are plain data plus a compiled query artifact.
 */

import { createStaticRouter } from "@canonical/router-core";
import type { Variables } from "relay-runtime";
import {
  type RouteQueryEntry,
  readRouteQueryEntry,
} from "#relay/routeQuery.js";
import { appRoutes, middleware, notFoundRoute } from "../routes.js";

/** A matched route's query, its variables already built from the match. */
export interface ResolvedRouteQuery {
  readonly query: RouteQueryEntry["query"];
  readonly variables: Variables;
}

let collected: ReadonlyMap<string, RouteQueryEntry> | undefined;

/**
 * Collect every route's query entry, keyed by route name. Routes are static,
 * so the walk happens once; a malformed entry throws at first collection
 * (see `readRouteQueryEntry`).
 */
export const collectRouteQueries = (): ReadonlyMap<string, RouteQueryEntry> => {
  if (!collected) {
    const map = new Map<string, RouteQueryEntry>();
    for (const [name, appRoute] of Object.entries(appRoutes)) {
      const entry = readRouteQueryEntry(appRoute.meta);
      if (entry) map.set(name, entry);
    }
    collected = map;
  }
  return collected;
};

/**
 * Match `url` against the app's routes and resolve the matched route's query
 * entry, if it declares one. Returns `undefined` for unmatched URLs,
 * redirects, not-found, and routes without an entry.
 */
export const matchRouteQuery = (
  url: string,
): ResolvedRouteQuery | undefined => {
  const router = createStaticRouter(appRoutes, url, {
    middleware: [...middleware],
    notFound: notFoundRoute,
  });
  const match = router.match;
  if (!match || match.kind !== "route") return undefined;
  const entry = collectRouteQueries().get(match.name);
  if (!entry) return undefined;
  return {
    query: entry.query,
    variables: entry.variables(
      (match.params ?? {}) as Readonly<Record<string, unknown>>,
      (match.search ?? {}) as Readonly<Record<string, unknown>>,
    ),
  };
};
