/**
 * The generic route-table walk: every route carrying a given facet.
 *
 * This is a GENERALISATION OF AN EXISTING WALK, not a new idea —
 * `collectRouteQueries` (`src/server/routeQueries.ts`) does exactly this for
 * the query facet, and predates it. Anything needing "the set of routes that
 * annotated themselves with X" should come here rather than grow a third
 * copy of the loop.
 */

import type { AnyRoute } from "@canonical/router-core";
import type { RouteFacet, RouteMeta } from "./defineFacet.js";

/** A route that carries the facet, with its table key and parsed value. */
export interface FacetBearer<TName extends string, TValue> {
  readonly name: TName;
  readonly route: AnyRoute;
  readonly value: TValue;
}

/**
 * Every route in `routes` carrying `facet`, in the table's own key order.
 *
 * THE TABLE IS FLAT — do not write recursion here. `appRoutes`
 * (`src/routes.tsx`) is a `Record<name, RouteDefinition>`, and `group()`
 * only PREPENDS a wrapper to each route rather than nesting it, so there is
 * no tree to walk. One level of `Object.entries` is the whole traversal.
 *
 * ORDER IS INCIDENTAL. It is `appRoutes`' declaration order, which is a
 * destructuring convenience and not a ruling. It must never drive anything
 * user-visible: the Rail's lens order is owner-ruled and stays declared in
 * `#lib/Rail/constants.js`.
 *
 * A malformed annotation throws HERE, at first collection, exactly as
 * `collectRouteQueries` does — one bad route fails the whole collection
 * rather than quietly dropping itself out of the set.
 */
export const collectFacet = <
  TRoutes extends Readonly<Record<string, AnyRoute>>,
  TValue,
>(
  facet: RouteFacet<TValue>,
  routes: TRoutes,
): readonly FacetBearer<Extract<keyof TRoutes, string>, TValue>[] => {
  const bearers: FacetBearer<Extract<keyof TRoutes, string>, TValue>[] = [];
  for (const [name, route] of Object.entries(routes)) {
    const value = facet.read(route.meta as RouteMeta | undefined);
    if (value !== undefined) {
      bearers.push({
        name: name as Extract<keyof TRoutes, string>,
        route,
        value,
      });
    }
  }
  return bearers;
};
