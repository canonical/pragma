# Router middleware cookbook

Middleware in `@canonical/router-core` transforms routes once, before the router is created. Use middleware when a concern should apply consistently across a route map without editing every route declaration by hand.

This is a recipe collection. Each recipe is a self-contained middleware factory you can copy, adapt, and compose. Every example is valid against the current API: the route data hook is `prefetch(params, search, context)` — there is no `fetch` field.

## When to use middleware

Use middleware for cross-cutting policy:

- auth redirects
- locale prefixes or locale-aware navigation setup
- timing or tracing of navigation-time work
- shared wrapper or error-boundary policy

Avoid middleware when the concern is relevant to a single route. In that case, keep it in the route's `prefetch` or `content`. Prefer wrappers (`wrapper()` + `group()`) for layout and shared UI; reserve middleware for behaviour that rewrites the route itself.

## The middleware contract

A `RouteMiddleware` is a route endomorphism: a function from a route to a route of the same type.

```ts
import type { AnyRoute, RouteMiddleware } from "@canonical/router-core";

const passthrough: RouteMiddleware = <TRoute extends AnyRoute>(
  currentRoute: TRoute,
): TRoute => {
  return currentRoute;
};
```

The `<TRoute extends AnyRoute>` generic is what keeps middleware type-preserving: the route you return is the same shape (and same named-route type) as the one you received. Returning the route unchanged is always valid — that is the correct response when a rule does not apply.

A middleware **factory** is a function that captures configuration and returns a `RouteMiddleware`:

```ts
function withSomething(config: string): RouteMiddleware {
  return ((currentRoute: AnyRoute) => {
    // inspect currentRoute.url, currentRoute.meta, etc.
    return currentRoute;
  }) as RouteMiddleware;
}
```

The cast on the inner arrow (`as RouteMiddleware`) is the practical idiom: the body works with `AnyRoute`, but the exported value advertises the type-preserving generic signature. This mirrors the real `withAuth` factory in the boilerplate.

## How middleware is applied

`applyMiddleware(routes, middleware)` runs the middleware over an array of routes and rebuilds each route's `parse`/`render` codec from the (possibly changed) `url`. You rarely call it directly — `createBrowserRouter`, `createStaticRouter`, and `createMemoryRouter` all accept a `middleware` option and apply it for you.

```ts
import { createBrowserRouter } from "@canonical/router-core";

const router = createBrowserRouter(appRoutes, {
  middleware: [withAuth("/login")],
  notFound: notFoundRoute,
});
```

Two facts about `applyMiddleware` worth internalising:

1. **It rebuilds the codec from `url`.** After the middleware chain runs, `parse(url)` and `render(params)` are regenerated from `transformed.url`. So a middleware that rewrites `url` (for example, a locale prefix) gets coherent matching and link-building for free — you do not rebuild the codec yourself.
2. **Outermost-first array semantics.** The middleware array is reversed and folded, so the **first** entry in the array is the **outermost** transform: it sees the route last on the way in and its effect wraps everything after it. Order your array from broadest policy to narrowest. See [Composition order](#composition-order).

## Recipe: `withAuth(loginPath)`

Redirect anonymous visitors away from protected routes before their data is warmed. This is the canonical recipe, and the one place the runtime-redirect mechanics matter most.

```ts
import {
  type AnyRoute,
  type NavigationContext,
  redirect,
  type RouteMiddleware,
  type RouteParamValues,
} from "@canonical/router-core";

const protectedPaths = new Set(["/account"]);

function hasDemoAuth(search: unknown): boolean {
  return (search as Record<string, unknown>)?.auth === "1";
}

export function withAuth(loginPath: string): RouteMiddleware {
  return ((currentRoute: AnyRoute) => {
    if (!protectedPaths.has(currentRoute.url)) {
      return currentRoute;
    }

    const currentPrefetch = currentRoute.prefetch;

    return {
      ...currentRoute,
      prefetch: (
        params: unknown,
        search: unknown,
        context: NavigationContext,
      ) => {
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
```

What makes this correct against the current API:

- **The data hook is `prefetch`, not `fetch`.** The route's only data hook is `prefetch(params, search, context)`. The middleware captures the original (`const currentPrefetch = currentRoute.prefetch;`) and delegates to it once the auth check passes.
- **`redirect()` does not return — it throws.** `redirect(to, status)` constructs a `RouteRedirect` (exported as `Redirect`) and throws it; its return type is `never`. You do not `return redirect(...)`. The throw unwinds out of the void-returning `prefetch`, and the router catches it and performs the navigation. Because the redirect throws, the `currentPrefetch(...)` call below it is unreachable for unauthenticated visitors — exactly the intent.
- **`prefetch` returns `void | Promise<void>`.** The redirect is a side effect on the control flow, not a value the hook hands back. Never try to model the redirect as a return value or a resolved promise.
- **Status `302` is the runtime default.** The runtime `redirect()` helper accepts `301 | 302 | 307 | 308` and defaults to `302`. The boilerplate passes `302` explicitly. Do not confuse this with static redirect routes (`route({ url, redirect, status })`), whose `status` is narrower: `301 | 308` only.

### The pure-decision companion: `getAuthRedirectHref`

The middleware decides at navigation time, inside `prefetch`. But a server (sitemap generation, an SSR pre-flight, an edge function) often needs the **same** decision *without* a router and without throwing. Factor the decision into a pure helper and call it from both places:

```ts
export function getAuthRedirectHref(input: string | URL): string | null {
  const url =
    input instanceof URL
      ? input
      : new URL(input, "https://router.local");

  if (
    !protectedPaths.has(url.pathname) ||
    hasDemoAuth({ auth: url.searchParams.get("auth") })
  ) {
    return null;
  }

  return `/login?from=${encodeURIComponent(url.pathname)}`;
}
```

`getAuthRedirectHref` returns the redirect target as a string, or `null` when no redirect is needed. It never throws and never touches the router, so a server can branch on it before rendering:

```ts
const redirectHref = getAuthRedirectHref(requestUrl);
if (redirectHref) {
  return Response.redirect(redirectHref, 302);
}
// otherwise fall through to createStaticRouter(...) + render
```

This is the corrected shape of the auth recipe: the **throwing** path lives inside `prefetch` (client navigation), the **pure** path is a reusable function (server pre-flight), and both share `protectedPaths` and `hasDemoAuth` so the policy cannot drift between them.

### Rationale

- centralises auth policy in one factory plus one pure helper
- preserves the route's typed helpers (`render`, `parse`) — `applyMiddleware` rebuilds the codec
- keeps the throwing redirect strictly out of any value position

## Recipe: `withI18n(defaultLocale)`

Prefix every route with a `:locale` segment and inject the resolved locale into downstream `prefetch` work. Because `applyMiddleware` rebuilds the codec from the rewritten `url`, both matching and link-building pick up the new segment automatically.

```ts
import {
  type AnyRoute,
  type NavigationContext,
  type RouteMiddleware,
} from "@canonical/router-core";

export function withI18n(defaultLocale: string): RouteMiddleware {
  return ((currentRoute: AnyRoute) => {
    const currentPrefetch = currentRoute.prefetch;

    return {
      ...currentRoute,
      url: `/:locale${currentRoute.url === "/" ? "" : currentRoute.url}`,
      prefetch: currentPrefetch
        ? (
            params: Record<string, string>,
            search: unknown,
            context: NavigationContext,
          ) => {
            const locale = params.locale ?? defaultLocale;

            return currentPrefetch(params, { ...(search as object), locale }, context);
          }
        : undefined,
    };
  }) as RouteMiddleware;
}
```

Notes:

- The rewritten `url` becomes `/:locale/account`, `/:locale/guides/:slug`, and so on. You do not call `matchPath`/`renderPattern` yourself — `applyMiddleware` does it from `transformed.url`.
- `prefetch` stays `undefined` when the source route has no data hook. Wrapping a non-existent hook would force a hook onto a route that never had one.
- The locale is folded into `search` for the delegated `prefetch` call; the original three-argument shape `(params, search, context)` is preserved.

### Rationale

- one place to enforce locale-aware URLs
- pairs naturally with boilerplate/route generators
- the codec rebuild means typed `Link`/`navigate` keep working after the URL changes

## Recipe: `withTiming(report)`

Measure how long a route's navigation-time `prefetch` runs. Pure instrumentation: it never changes routing behaviour.

```ts
import {
  type AnyRoute,
  type NavigationContext,
  type RouteMiddleware,
} from "@canonical/router-core";

export function withTiming(
  report: (event: { route: string; durationMs: number }) => void,
): RouteMiddleware {
  return ((currentRoute: AnyRoute) => {
    const currentPrefetch = currentRoute.prefetch;

    if (!currentPrefetch) {
      return currentRoute;
    }

    return {
      ...currentRoute,
      prefetch: async (
        params: unknown,
        search: unknown,
        context: NavigationContext,
      ) => {
        const startedAt = performance.now();

        try {
          return await currentPrefetch(params, search, context);
        } finally {
          report({
            durationMs: performance.now() - startedAt,
            route: currentRoute.url,
          });
        }
      },
    };
  }) as RouteMiddleware;
}
```

Notes:

- Return the route untouched when there is no `prefetch` to time.
- `prefetch` may return `void` or `Promise<void>`; `await` handles both, and the `finally` reports even if the hook throws (including a `redirect()` thrown by an inner auth middleware) — instrumentation should not swallow that throw.

### Rationale

- keeps instrumentation orthogonal to route logic
- trivial to disable in tests (pass a no-op `report`)
- works for analytics, tracing, and SLO dashboards

## Recipe: `withErrorBoundary(boundary)`

Share one wrapper across a set of routes by prepending it to each route's `wrappers` array. This is the middleware route to applying a wrapper uniformly when `group()` at the call site is inconvenient.

```ts
import {
  type AnyRoute,
  type RouteMiddleware,
  type WrapperDefinition,
} from "@canonical/router-core";
import type { ReactElement } from "react";
import { wrapper } from "@canonical/router-core";

const shellBoundary = wrapper<ReactElement>({
  id: "shell:error-boundary",
  component: ({ children }) => children,
});

export function withErrorBoundary(
  boundary: WrapperDefinition<ReactElement> = shellBoundary,
): RouteMiddleware {
  return ((currentRoute: AnyRoute) => {
    return {
      ...currentRoute,
      wrappers: [boundary, ...currentRoute.wrappers],
    };
  }) as RouteMiddleware;
}
```

Notes:

- `wrappers` is always present on a `RouteDefinition` (it defaults to `[]`), so `[boundary, ...currentRoute.wrappers]` is safe without a guard.
- `wrapper()` takes a single type parameter, `wrapper<TRendered>` (here `ReactElement`). A wrapper's own optional `prefetch` is `(params, context)` — two arguments, no `search` — distinct from a route's three-argument `prefetch`.
- The error experience itself is a React `<ErrorBoundary>` inside the wrapper component. The router has no error-UI field; render errors propagate past `<Outlet>`, so the boundary belongs in the wrapper's JSX. Use `StatusResponse` from a `prefetch` to signal an HTTP-like status to that boundary.

### Rationale

- consistent fallback behaviour across many routes
- keeps route declarations focused on `content` and data
- composes with layout wrappers (it prepends, so it nests outside them)

## Composition order

Middleware runs with outermost-first array semantics: the first array entry is the outermost transform. Order from broadest URL policy to narrowest concern.

```ts
import { createBrowserRouter } from "@canonical/router-core";

const router = createBrowserRouter(appRoutes, {
  middleware: [withI18n("en"), withAuth("/login"), withTiming(report)],
  notFound: notFoundRoute,
});
```

Reading the array left to right:

1. `withI18n("en")` rewrites the URL first, so `withAuth` and `withTiming` see the locale-prefixed route and the locale-aware `prefetch`.
2. `withAuth("/login")` wraps the (now locale-aware) `prefetch` with its redirect guard.
3. `withTiming(report)` wraps last, so its timer is the innermost wrapper around whatever the chain produced — it measures the full composed `prefetch`, redirect throw included.

If you reverse the order, `withAuth` would inspect the unprefixed URL and the timer would sit outside the redirect logic. Order is meaningful; choose it deliberately.

The boilerplate exports its chain as a `const` tuple and spreads it into both entries so client and server apply identical policy:

```ts
export const middleware = [withAuth("/login")] as const;

// client: createBrowserRouter(appRoutes, { middleware: [...middleware], notFound: notFoundRoute })
// server: createStaticRouter(appRoutes, url, { middleware: [...middleware], notFound: notFoundRoute })
```

## Rules of thumb

- return the original route unchanged when the rule does not apply
- capture and delegate to `currentRoute.prefetch` — never assume it exists, and never replace it with a hook the route never had
- there is no `fetch` field; `prefetch(params, search, context)` is the only route data hook
- `redirect()` throws (`never`) — call it for its side effect inside `prefetch`, never `return` it
- factor any decision a server also needs into a pure helper (the `getAuthRedirectHref` pattern) so client and server share one policy
- prefer middleware for cross-cutting policy, wrappers (`wrapper()` + `group()`) for layout and shared UI
- document any redirect or URL-shape change clearly for consumers — middleware rewrites routes out from under the call site

## See a working example

The live auth middleware — `withAuth` and the pure `getAuthRedirectHref` companion — is in [apps/react/boilerplate-vite/src/routes.tsx](../../apps/react/boilerplate-vite/src/routes.tsx). The routes it transforms, including the `~standard` search schemas, are in [apps/react/boilerplate-vite/src/domains/account/routes.ts](../../apps/react/boilerplate-vite/src/domains/account/routes.ts) and [apps/react/boilerplate-vite/src/domains/marketing/routes.ts](../../apps/react/boilerplate-vite/src/domains/marketing/routes.ts). The client and server entries that apply the middleware are [src/client/entry.tsx](../../apps/react/boilerplate-vite/src/client/entry.tsx) and [src/server/entry.tsx](../../apps/react/boilerplate-vite/src/server/entry.tsx).

## Reference

- [Router core README](../../packages/runtime/router/README.md)
- [`applyMiddleware` source](../../packages/runtime/router/src/lib/applyMiddleware.ts)
- [Migrating to the pragma router](./MIGRATE_TO_PRAGMA_ROUTER.md)
