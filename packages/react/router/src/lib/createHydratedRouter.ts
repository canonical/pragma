import { INITIAL_DATA_KEY } from "@canonical/react-ssr/renderer/constants";
import type {
  AnyRoute,
  RouteMap,
  Router,
  RouterDehydratedState,
} from "@canonical/router-core";
import {
  createRouter as createCoreRouter,
  createHistoryAdapter,
} from "@canonical/router-core";
import type {
  CreateHydratedRouterOptions,
  CreateHydratedRouterWindow,
} from "./types.js";

function readInitialState<TRoutes extends RouteMap>(
  browserWindow: CreateHydratedRouterWindow,
): RouterDehydratedState<TRoutes> | null {
  return ((browserWindow as Record<string, unknown>)[INITIAL_DATA_KEY] ??
    null) as RouterDehydratedState<TRoutes> | null;
}

/**
 * Create a browser-backed router that reuses dehydrated server state.
 *
 * The function reads the initial router payload from the configured window,
 * creates a browser adapter, and passes both into `createRouter()` so client
 * hydration resumes from the server-rendered match instead of reloading it.
 *
 * @param routes - The application's route map.
 * @param options - Router options plus an optional window-like object to read
 * hydration state from.
 */
export default function createHydratedRouter<
  const TRoutes extends RouteMap,
  const TNotFound extends AnyRoute | undefined = undefined,
>(
  routes: TRoutes,
  options?: CreateHydratedRouterOptions<TNotFound>,
): Router<TRoutes, TNotFound> {
  const browserWindow =
    options?.browserWindow ?? (window as unknown as CreateHydratedRouterWindow);
  const { browserWindow: _unusedBrowserWindow, ...routerOptions } =
    options ?? {};
  const initialState = readInitialState<TRoutes>(browserWindow);
  const router = createCoreRouter(routes, {
    ...routerOptions,
    adapter: createHistoryAdapter(browserWindow as never),
    hydratedState:
      (initialState as unknown as RouterDehydratedState<RouteMap>) ?? undefined,
  });

  return router;
}
