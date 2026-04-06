import type { AnyRoute, RouteMap } from "@canonical/router-core";

/**
 * Augmentable registration interface for router types.
 *
 * Declare this module in your app's router file to enable type-safe routing
 * without explicit generics at every call site:
 *
 * ```ts
 * declare module "@canonical/router-react" {
 *   interface RouterRegister {
 *     routes: typeof appRoutes;
 *   }
 * }
 * ```
 *
 * When no registration exists the fallback is `RouteMap` (any string key),
 * which compiles but provides no autocomplete or typo detection.
 */
// biome-ignore lint/suspicious/noEmptyInterface: must be an interface for declaration merging
export interface RouterRegister {}

/** Resolves to the registered route map, or falls back to `RouteMap`. */
export type RegisteredRouteMap = RouterRegister extends {
  routes: infer T extends RouteMap;
}
  ? T
  : RouteMap;

/** Resolves to the registered not-found route, or falls back to `undefined`. */
export type RegisteredNotFound = RouterRegister extends {
  notFound: infer T extends AnyRoute | undefined;
}
  ? T
  : undefined;
