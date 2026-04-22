import createMemoryAdapter from "./createMemoryAdapter.js";
import createRouter from "./createRouter.js";
import type { AnyRoute, RouteMap, Router, RouterOptions } from "./types.js";

/**
 * Create an in-memory router for testing.
 *
 * Equivalent to `createRouter(routes, { adapter: createMemoryAdapter(initialUrl), ...options })`.
 */
export default function createMemoryRouter<
  const TRoutes extends RouteMap,
  const TNotFound extends AnyRoute | undefined = undefined,
>(
  routes: TRoutes,
  initialUrl: string | URL = "/",
  options?: Omit<RouterOptions<TNotFound>, "adapter">,
): Router<TRoutes, TNotFound> {
  return createRouter(routes, {
    ...options,
    adapter: createMemoryAdapter(initialUrl),
  });
}
