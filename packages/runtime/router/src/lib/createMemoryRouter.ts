import createMemoryAdapter from "./createMemoryAdapter.js";
import createRouter from "./createRouter.js";
import type {
  AnyRoute,
  MemoryAdapterOptions,
  RouteMap,
  Router,
  RouterOptions,
} from "./types.js";

/**
 * Create an in-memory router for testing.
 *
 * Equivalent to `createRouter(routes, { adapter: createMemoryAdapter(initialUrl), ...options })`.
 *
 * Pass `options.history` to delegate location ownership to a host instead of
 * the adapter's internal stack; see `createMemoryAdapter`.
 */
export default function createMemoryRouter<
  const TRoutes extends RouteMap,
  const TNotFound extends AnyRoute | undefined = undefined,
>(
  routes: TRoutes,
  initialUrl: string | URL = "/",
  options?: Omit<RouterOptions<TNotFound>, "adapter"> & MemoryAdapterOptions,
): Router<TRoutes, TNotFound> {
  const { history, ...routerOptions } = options ?? {};

  return createRouter(routes, {
    ...routerOptions,
    adapter: createMemoryAdapter(initialUrl, history ? { history } : undefined),
  });
}
