import { INITIAL_DATA_KEY } from "@canonical/react-ssr/renderer/constants";
import type {
  AnyRoute,
  RouteMap,
  Router,
  RouterDehydratedState,
} from "@canonical/router-core";
import {
  createBrowserAdapter,
  createRouter as createCoreRouter,
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
    adapter: createBrowserAdapter(browserWindow as never),
    hydratedState:
      (initialState as unknown as RouterDehydratedState<RouteMap>) ?? undefined,
  });

  return router;
}
