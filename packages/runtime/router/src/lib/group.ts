import type { AnyRoute, AnyWrapper, GroupedRoutes } from "./types.js";

/** Prepend a wrapper annotation to every route in a flat route list. */
export default function group<
  TWrapper extends AnyWrapper,
  TRoutes extends readonly AnyRoute[],
>(nextWrapper: TWrapper, routes: TRoutes): GroupedRoutes<TWrapper, TRoutes> {
  return routes.map((currentRoute) => ({
    ...currentRoute,
    wrappers: [nextWrapper, ...currentRoute.wrappers],
  })) as GroupedRoutes<TWrapper, TRoutes>;
}
