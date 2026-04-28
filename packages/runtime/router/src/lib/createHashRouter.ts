import createHashAdapter from "./createHashAdapter.js";
import createRouter from "./createRouter.js";
import type { AnyRoute, RouteMap, Router, RouterOptions } from "./types.js";

/**
 * Create a hash-based router that stores the route in `window.location.hash`.
 *
 * Useful for environments without a real server (Storybook, static file hosts)
 * where the URL path is fixed and only the fragment can change.
 *
 * Equivalent to `createRouter(routes, { adapter: createHashAdapter(), ...options })`.
 */
export default function createHashRouter<
  const TRoutes extends RouteMap,
  const TNotFound extends AnyRoute | undefined = undefined,
>(
  routes: TRoutes,
  options?: Omit<RouterOptions<TNotFound>, "adapter">,
): Router<TRoutes, TNotFound> {
  return createRouter(routes, {
    ...options,
    adapter: createHashAdapter(),
  });
}
