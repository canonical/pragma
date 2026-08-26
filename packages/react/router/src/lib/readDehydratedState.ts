import { INITIAL_DATA_KEY } from "@canonical/react-ssr/renderer/constants";
import type { RouteMap, RouterDehydratedState } from "@canonical/router-core";
import type { HydrationWindow } from "./types.js";

/**
 * Read the router's dehydrated SSR state from the initial-data payload.
 *
 * The server serializes `router.dehydrate()`'s fields into the page's
 * `__INITIAL_DATA__` payload; passing the result to `createRouter()` as
 * `hydratedState` resumes from the server-rendered match instead of
 * reloading it:
 *
 * ```ts
 * const router = createRouter(routes, {
 *   adapter: createBrowserAdapter(),
 *   hydratedState: readDehydratedState() ?? undefined,
 * });
 * ```
 *
 * Returns `null` when no payload is present or when the payload does not
 * carry dehydrated router state (e.g. an initial-data object without router
 * fields) — the router then performs a normal initial load.
 */
export default function readDehydratedState<
  TRoutes extends RouteMap = RouteMap,
>(
  browserWindow: HydrationWindow = window as unknown as HydrationWindow,
): RouterDehydratedState<TRoutes> | null {
  const candidate = (browserWindow as Record<string, unknown>)[
    INITIAL_DATA_KEY
  ];

  if (typeof candidate !== "object" || candidate === null) {
    return null;
  }

  const state = candidate as { href?: unknown; kind?: unknown };

  if (typeof state.href !== "string" || typeof state.kind !== "string") {
    return null;
  }

  return candidate as RouterDehydratedState<TRoutes>;
}
