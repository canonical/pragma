// =============================================================================
// A static (server-positioned) router for this app's SSR paths and tests.
//
// `@canonical/router-core` ships this behaviour as `createStaticRouter` but
// does NOT export it — main's public surface is `createRouter` plus adapters.
// Rather than re-implement the synchronous hydrate at 20-odd call sites (and
// silently lose it at the ones that forget), the shape lives here once, built
// entirely from the router's PUBLIC api: `createRouter` + `createServerAdapter`
// + `hydrate`.
//
// It is app-local on purpose. The despecialization keeps this repository's
// shared packages as main defines them; where the app needs a convenience main
// does not publish, the app owns the convenience.
// =============================================================================

import { createRouter, createServerAdapter } from "@canonical/router-core";
import type {
  AnyRoute,
  RouteMap,
  Router,
  RouterMatch,
  RouterOptions,
} from "@canonical/router-core";

/**
 * Create a static router for server-side rendering.
 *
 * Matches the URL synchronously and hydrates the store so `render()` works
 * immediately without awaiting `load()`. Prefetch fires in the background.
 *
 * The match result is available via `staticRouter.match` for status code
 * determination before rendering.
 *
 * ```ts
 * const router = createStaticRouter(routes, req.url);
 *
 * if (!router.match) { res.status(404); }
 * else if (router.match.kind === "redirect") {
 *   return res.redirect(router.match.status, router.match.redirectTo);
 * }
 * ```
 */
export default function createStaticRouter<
  const TRoutes extends RouteMap,
  const TNotFound extends AnyRoute | undefined = undefined,
>(
  routes: TRoutes,
  url: string | URL,
  options?: Omit<RouterOptions<TNotFound>, "adapter" | "initialUrl">,
): Router<TRoutes, TNotFound> & {
  readonly match: RouterMatch<TRoutes, TNotFound> | null;
} {
  const router = createRouter(routes, {
    ...options,
    adapter: createServerAdapter(url),
  });

  const matchResult = router.match(url);
  const status = matchResult?.status ?? 404;
  const kind =
    matchResult?.kind === "route"
      ? "route"
      : matchResult?.kind === "not-found"
        ? "not-found"
        : "unmatched";
  const routeId = matchResult?.kind === "route" ? matchResult.name : null;

  // Hydrate the store synchronously so render() works without awaiting load().
  // Skip for unmatched URLs (including redirects) — the server handles those
  // before rendering.
  if (kind !== "unmatched") {
    router.hydrate({
      href: typeof url === "string" ? url : url.href,
      kind,
      routeId,
      status,
    });
  }

  return Object.assign(router, {
    get match() {
      return matchResult;
    },
  });
}
