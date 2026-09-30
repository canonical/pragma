/**
 * The browser-session Relay environment, published for route prefetch hooks
 * (the P-5 hover/initial-load warm-up seam — see `warmRouteQuery`).
 *
 * A module-scope holder rather than React context on purpose: route
 * `prefetch` callbacks run inside the router core, outside any React tree,
 * so context cannot reach them. `hydrateApp` sets the holder right after it
 * creates the one client environment (before router creation — the browser
 * router's initial `performLoad` fires prefetch hooks). The server bricks
 * never call the setter in any of their module registries, so on the SSR
 * paths the holder stays empty and every prefetch is a no-op by
 * construction — server data preparation stays `prepareRelayData`'s job.
 */

import type { Environment } from "relay-runtime";

let prefetchEnvironment: Environment | undefined;

/**
 * Publish (or, in tests, clear) the environment prefetch hooks warm.
 * Call once per browser session, from `hydrateApp`.
 */
export const setPrefetchEnvironment = (
  environment: Environment | undefined,
): void => {
  prefetchEnvironment = environment;
};

/** The published environment, or `undefined` outside a hydrated browser. */
export const getPrefetchEnvironment = (): Environment | undefined =>
  prefetchEnvironment;
