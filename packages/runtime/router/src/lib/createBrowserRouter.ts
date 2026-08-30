import createBrowserAdapter from "./createBrowserAdapter.js";
import createRouter from "./createRouter.js";
import type { AnyRoute, RouteMap, Router, RouterOptions } from "./types.js";

/**
 * Create a browser-backed router using the best available platform API.
 *
 * Uses the Navigation API when available, falling back to the History API.
 * Equivalent to `createRouter(routes, { adapter: createBrowserAdapter(), ...options })`.
 */
export default function createBrowserRouter<
  const TRoutes extends RouteMap,
  const TNotFound extends AnyRoute | undefined = undefined,
>(
  routes: TRoutes,
  options?: Omit<RouterOptions<TNotFound>, "adapter">,
): Router<TRoutes, TNotFound> {
  return createRouter(routes, {
    ...options,
    adapter: createBrowserAdapter(),
  });
}
