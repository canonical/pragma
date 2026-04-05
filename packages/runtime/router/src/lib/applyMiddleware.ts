import type { AnyRoute, RouteMiddleware } from "./types.js";

/** Apply route endomorphisms with outermost-first array semantics. */
export default function applyMiddleware<TRoutes extends readonly AnyRoute[]>(
  routes: TRoutes,
  middleware: readonly RouteMiddleware[],
): TRoutes {
  return routes.map((route) => {
    return [...middleware]
      .reverse()
      .reduce((currentRoute, currentMiddleware) => {
        return currentMiddleware(currentRoute);
      }, route);
  }) as unknown as TRoutes;
}
