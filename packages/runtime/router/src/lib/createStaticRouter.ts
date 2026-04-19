import createRouter from "./createRouter.js";
import createServerAdapter from "./createServerAdapter.js";
import type {
  AnyRoute,
  RouteMap,
  Router,
  RouterMatch,
  RouterOptions,
} from "./types.js";

/**
 * Create a static router for server-side rendering.
 *
 * Matches the provided URL on construction and fires `prefetch()` eagerly.
 * The match result is available synchronously via `staticRouter.match` for
 * status code determination before rendering.
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

  // Fire prefetch eagerly — cache starts warming before React renders.
  if (matchResult && matchResult.kind === "route") {
    void router.load(url).catch(() => {});
  }

  return Object.assign(router, {
    get match() {
      return matchResult;
    },
  });
}
