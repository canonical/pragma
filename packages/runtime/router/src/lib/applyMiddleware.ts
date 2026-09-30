import { createRouteCodec } from "./pathUtils.js";
import type { AnyRoute, RouteMiddleware } from "./types.js";

/**
 * Apply route endomorphisms with outermost-first array semantics.
 *
 * After middleware transforms each route, `parse` and `render` are rebuilt
 * from the (possibly changed) `url` pattern so the codec stays coherent.
 */
export default function applyMiddleware<TRoutes extends readonly AnyRoute[]>(
  routes: TRoutes,
  middleware: readonly RouteMiddleware[],
): TRoutes {
  if (middleware.length === 0) {
    return routes;
  }

  return routes.map((route) => {
    const transformed = [...middleware]
      .reverse()
      .reduce<AnyRoute>((currentRoute, currentMiddleware) => {
        return currentMiddleware(currentRoute);
      }, route);

    return {
      ...transformed,
      ...createRouteCodec(transformed.url, transformed.params),
    };
  }) as unknown as TRoutes;
}
