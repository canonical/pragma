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

  const state = candidate as {
    href?: unknown;
    kind?: unknown;
    routeId?: unknown;
    status?: unknown;
  };

  if (
    typeof state.href !== "string" ||
    typeof state.status !== "number" ||
    (state.kind !== "route" &&
      state.kind !== "not-found" &&
      state.kind !== "unmatched")
  ) {
    return null;
  }

  if (state.kind === "route" && typeof state.routeId !== "string") {
    return null;
  }

  // Return a normalized copy so extra payload keys (url, theme, …) and any
  // malformed routeId on non-route kinds never reach hydrate().
  return {
    href: state.href,
    kind: state.kind,
    routeId: state.kind === "route" ? state.routeId : null,
    status: state.status,
  } as RouterDehydratedState<TRoutes>;
}
