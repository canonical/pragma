/**
 * The demo authentication guard: which paths are protected, and where an
 * unauthenticated request for one should go instead.
 *
 * WHY IT IS A LEAF MODULE RATHER THAN PART OF `routes.tsx`. The guard has to
 * be answerable in TWO places. Client-side it is route middleware, consulted
 * as the router navigates. Server-side it has to be consulted by the HTTP
 * entry point, BEFORE a renderer exists — an SSR render is synchronous and
 * cannot issue a redirect, so a guard that lived only in the route's `warm`
 * hook would let a hard `GET /account` render the protected page with 200
 * while an in-app navigation to the same URL redirected. Those two answers
 * disagreeing is the bug; one module both callers can reach is the fix.
 *
 * So this module imports nothing from the app — no pages, no CSS, no React.
 * The dev and preview servers import it directly (the same discipline
 * `#graphql-endpoint` keeps, and for the same reason: a server process must be
 * able to load it without dragging the browser bundle in).
 *
 * WHAT "AUTHENTICATION" MEANS HERE. `?auth=1`, and nothing else — the demo the
 * application scaffold ships, which `LoginPage` tells the reader about in so
 * many words. It protects nothing and is not meant to; it exists so the route
 * middleware, the redirect, and the login round trip are wired and exercised
 * before anything real is put behind them. Replace `hasDemoAuth` when there is
 * a real session to read and the rest of this file still holds.
 */

import type {
  AnyRoute,
  NavigationContext,
  RouteMiddleware,
  RouteParamValues,
} from "@canonical/router-core";
import { redirect } from "@canonical/router-core";

/** The paths the guard covers. */
const protectedPaths = new Set(["/account"]);

/** The demo credential: `?auth=1` on the request. */
function hasDemoAuth(search: unknown): boolean {
  const authValue = (search as Record<string, unknown>)?.auth;

  return authValue === "1";
}

/**
 * Where an unauthenticated request for `input` should be sent, or `null` when
 * the request may proceed.
 *
 * Takes a URL or a path so an HTTP entry point can ask it about a raw request
 * line, and answers a path so the caller can put it straight in a `Location`
 * header.
 */
export function getAuthRedirectHref(input: string | URL): string | null {
  // Absolute URLs are used as-is; relative paths resolve against a dummy base.
  const url =
    input instanceof URL ? input : new URL(input, "https://router.local");

  if (
    !protectedPaths.has(url.pathname) ||
    hasDemoAuth({ auth: url.searchParams.get("auth") })
  ) {
    return null;
  }

  return `/login?from=${encodeURIComponent(url.pathname)}`;
}

/**
 * Route middleware enforcing the same rule during client navigation, where
 * there is no HTTP response to redirect and the router's own `redirect()` is
 * the mechanism.
 */
export function withAuth(loginPath: string): RouteMiddleware {
  return ((currentRoute: AnyRoute) => {
    if (!protectedPaths.has(currentRoute.url)) {
      return currentRoute;
    }

    const currentPrefetch = currentRoute.warm;

    return {
      ...currentRoute,
      warm: (params: unknown, search: unknown, context: NavigationContext) => {
        if (!hasDemoAuth(search)) {
          const from = currentRoute.render(
            (params ?? {}) as RouteParamValues | Record<string, never>,
          );

          redirect(`${loginPath}?from=${encodeURIComponent(from)}`, 302);
        }

        if (currentPrefetch) {
          return currentPrefetch(params, search, context);
        }
      },
    };
  }) as RouteMiddleware;
}
