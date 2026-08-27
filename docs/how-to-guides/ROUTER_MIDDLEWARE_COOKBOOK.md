# Router middleware cookbook

Middleware in `@canonical/router-core` transforms routes once, before the router is created. Use middleware when a concern should apply consistently across a route map without editing every route declaration by hand.

This is a recipe collection. Each recipe is a self-contained middleware factory you can copy, adapt, and compose. Every example is valid against the current API: the route data hook is `warm(params, search, context)` — there is no `fetch` field.

## When to use middleware

Use middleware for cross-cutting policy:

- auth redirects
- locale prefixes or locale-aware navigation setup
- timing or tracing of navigation-time work
- shared wrapper or error-boundary policy

Avoid middleware when the concern is relevant to a single route. In that case, keep it in the route's `warm` or `content`. Prefer wrappers (`wrapper()` + `group()`) for layout and shared UI; reserve middleware for behaviour that rewrites the route itself.

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

A middleware **factory** is a function that captures configuration and returns a `RouteMiddleware`. Write the inner function with the real generic signature — no `as RouteMiddleware` cast on the whole function:

```ts
function withSomething(config: string): RouteMiddleware {
  return <TRoute extends AnyRoute>(currentRoute: TRoute): TRoute => {
    // inspect currentRoute.url, currentRoute.meta, etc.
    return currentRoute;
  };
}
```

One narrow assertion remains when you *replace a property*: overriding `warm` (or `url`) on the spread object widens that property's type, and TypeScript cannot prove the result is still `TRoute`. Assert the constructed object back — `return { ...currentRoute, warm: guardedWarm } as TRoute;` — and keep the function signature itself honest. This mirrors the real `withAuth` factory in the boilerplate.

## How middleware is applied

`applyMiddleware(routes, middleware)` takes an **array** of routes and the middleware array, transforms each route through the chain, and rebuilds each route's `parse`/`render` codec from the (possibly changed) `url`. You rarely call it directly — `createRouter` accepts a `middleware` option and applies the chain to the whole route map for you:

```ts
import { createBrowserAdapter, createRouter } from "@canonical/router-core";

const router = createRouter(appRoutes, {
  adapter: createBrowserAdapter(),
  middleware: [withAuth("/login")],
  notFound: notFoundRoute,
});
```

Two facts about `applyMiddleware` worth internalising:

1. **It rebuilds the codec from `url`.** After the middleware chain runs, `parse(url)` and `render(params)` are regenerated from `transformed.url`. So a middleware that rewrites `url` (for example, a locale prefix) gets coherent matching and link-building for free — you do not rebuild the codec yourself.
2. **First entry = outermost.** The array is reversed and folded (`[...middleware].reverse().reduce(...)`), so with `[A, B, C]` the routes pass through **C first, then B, then A**. Two consequences, one per direction:
   - *Build time:* the **last** entry sees the original route; the **first** entry sees everything the others already produced. A URL rewrite by the first entry happens after the later entries already ran — they never see it.
   - *Runtime:* each middleware that wraps `warm` nests around the wrappers applied before it, so the **first** entry's hook code runs outermost (first on the way in), and the **last** entry's runs innermost, closest to the original hook.

   See [Composition order](#composition-order) for a worked example.

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
  return <TRoute extends AnyRoute>(currentRoute: TRoute): TRoute => {
    if (!protectedPaths.has(currentRoute.url)) {
      return currentRoute;
    }

    const currentWarm = currentRoute.warm;
    const guardedWarm = (
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

      if (currentWarm) {
        return currentWarm(params, search, context);
      }
    };

    // Overriding `warm` widens the property's type, so the object needs a
    // local assertion back to TRoute; the middleware's signature itself is
    // the real generic contract.
    return { ...currentRoute, warm: guardedWarm } as TRoute;
  };
}
```

What makes this correct against the current API:

- **The data hook is `warm`, not `fetch`.** The route's only data hook is `warm(params, search, context)`. The middleware captures the original (`const currentWarm = currentRoute.warm;`) and delegates to it once the auth check passes.
- **`redirect()` does not return — it throws.** `redirect(to, status)` constructs a `RouteRedirect` (exported as `Redirect`) and throws it; its return type is `never`. You do not `return redirect(...)`. The throw unwinds out of the void-returning `warm`, and the router catches it and performs the navigation. Because the redirect throws, the `currentWarm(...)` call below it is unreachable for unauthenticated visitors — exactly the intent.
- **The throw is honored from async hooks too.** A synchronous throw is applied before the navigation commits. If the guard is `async` (say, a session fetch precedes the check), the rejection carrying the `RouteRedirect` arrives after the route has already committed and rendered — the router then applies it late: the page shows briefly, then the redirect lands (as a history *replace*, so Back does not return to the guarded page). A superseded or abandoned navigation drops the late redirect. Fire-and-forget means render is never blocked; the flash is the honest price.
- **`warm` returns `void | Promise<void>`.** The redirect is a side effect on the control flow, not a value the hook hands back. Never try to model the redirect as a return value or a resolved promise.
- **Status `302` is the runtime default.** The runtime `redirect()` helper accepts `301 | 302 | 307 | 308` and defaults to `302`. The boilerplate passes `302` explicitly. Do not confuse this with static redirect routes (`route({ url, redirect, status })`), whose `status` is narrower: `301 | 308` only.

### The pure-decision companion: `getAuthRedirectForMatch`

The middleware decides at navigation time, inside `warm`. But a server (an SSR pre-flight, an edge function) needs the **same** decision without throwing. Factor it into a pure helper — and hand it the router's **match**, never the raw URL. A raw-URL check disagrees with router matching on exactly the inputs an attacker would try: matching ignores trailing empty path segments (`/account/` matches `/account`) and validated search keeps the **last** duplicate value (`?auth=1&auth=0` means `auth=0`), while `url.pathname` compares raw and `URLSearchParams.get()` reads the first value — so a raw-URL guard can SSR a protected page unauthenticated:

```ts
export function getAuthRedirectForMatch(match: {
  readonly route: AnyRoute;
  readonly search: unknown;
  readonly pathname: string;
}): string | null {
  if (!protectedPaths.has(match.route.url) || hasDemoAuth(match.search)) {
    return null;
  }

  return `/login?from=${encodeURIComponent(match.pathname)}`;
}
```

The helper never throws; the server **matches first** (with an adapterless pure-matcher router), then asks:

```ts
const matchResult = matcher.match(requestUrl); // adapterless createRouter — a pure matcher
const redirectHref =
  matchResult?.kind === "route" ? getAuthRedirectForMatch(matchResult) : null;
if (redirectHref) {
  return Response.redirect(redirectHref, 302);
}
// otherwise fall through to rendering — see the boilerplate's
// resolveRouteDisposition in apps/react/boilerplate-vite/src/server/entry.tsx
```

This is the corrected shape of the auth recipe: the **throwing** path lives inside `warm` (client navigation), the **pure** path is a reusable function fed by the router's own match (server pre-flight), and both share `protectedPaths` and `hasDemoAuth` so the policy cannot drift between them.

### Rationale

- centralises auth policy in one factory plus one pure helper
- preserves the route's typed helpers (`render`, `parse`) — `applyMiddleware` rebuilds the codec
- keeps the throwing redirect strictly out of any value position

## Recipe: `withI18n(defaultLocale)`

Prefix every route with a `:locale` segment and inject the resolved locale into downstream `warm` work. Because `applyMiddleware` rebuilds the codec from the rewritten `url`, both matching and link-building pick up the new segment automatically.

```ts
import {
  type AnyRoute,
  type NavigationContext,
  type RouteMiddleware,
} from "@canonical/router-core";

export function withI18n(defaultLocale: string): RouteMiddleware {
  return <TRoute extends AnyRoute>(currentRoute: TRoute): TRoute => {
    const currentWarm = currentRoute.warm;

    return {
      ...currentRoute,
      url: `/:locale${currentRoute.url === "/" ? "" : currentRoute.url}`,
      warm: currentWarm
        ? (
            params: Record<string, string>,
            search: unknown,
            context: NavigationContext,
          ) => {
            const locale = params.locale ?? defaultLocale;

            return currentWarm(
              params,
              { ...(search as object), locale },
              context,
            );
          }
        : undefined,
    } as TRoute;
  };
}
```

Notes:

- The rewritten `url` becomes `/:locale/account`, `/:locale/guides/:slug`, and so on. You do not call `matchPath`/`renderPattern` yourself — `applyMiddleware` does it from `transformed.url`.
- `warm` stays `undefined` when the source route has no data hook. Wrapping a non-existent hook would force a hook onto a route that never had one.
- The locale is folded into `search` for the delegated `warm` call; the original three-argument shape `(params, search, context)` is preserved.

### Rationale

- one place to enforce locale-aware URLs
- pairs naturally with boilerplate/route generators
- the codec rebuild means typed `Link`/`navigate` keep working after the URL changes

## Recipe: `withTiming(report)`

Measure how long a route's navigation-time `warm` runs. Pure instrumentation: it never changes routing behaviour.

```ts
import {
  type AnyRoute,
  type NavigationContext,
  type RouteMiddleware,
} from "@canonical/router-core";

export function withTiming(
  report: (event: { route: string; durationMs: number }) => void,
): RouteMiddleware {
  return <TRoute extends AnyRoute>(currentRoute: TRoute): TRoute => {
    const currentWarm = currentRoute.warm;

    if (!currentWarm) {
      return currentRoute;
    }

    const timedWarm = async (
      params: unknown,
      search: unknown,
      context: NavigationContext,
    ) => {
      const startedAt = performance.now();

      try {
        return await currentWarm(params, search, context);
      } finally {
        report({
          durationMs: performance.now() - startedAt,
          route: currentRoute.url,
        });
      }
    };

    return { ...currentRoute, warm: timedWarm } as TRoute;
  };
}
```

Notes:

- Return the route untouched when there is no `warm` to time.
- `warm` may return `void` or `Promise<void>`; `await` handles both.
- **Wrapping the hook in `async` does not break redirects or statuses.** A `redirect()` or `StatusResponse` thrown by an inner hook rejects the timing wrapper's promise, and the router honors async control-flow rejections: the redirect or status is applied late, after the navigation has committed (a brief render of the target, then the redirect, as a history replace). The `finally` still reports the duration in that case. What instrumentation must **not** do is swallow the rejection — re-throw (or, as here, simply do not catch), so the control flow reaches the router.

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
  wrapper,
} from "@canonical/router-core";
import type { ReactElement } from "react";

const shellBoundary = wrapper<ReactElement>({
  id: "shell:error-boundary",
  component: ({ children }) => children,
});

export function withErrorBoundary(
  boundary: WrapperDefinition<ReactElement> = shellBoundary,
): RouteMiddleware {
  return <TRoute extends AnyRoute>(currentRoute: TRoute): TRoute => {
    return {
      ...currentRoute,
      wrappers: [boundary, ...currentRoute.wrappers],
    } as TRoute;
  };
}
```

Notes:

- `wrappers` is always present on a `RouteDefinition` (it defaults to `[]`), so `[boundary, ...currentRoute.wrappers]` is safe without a guard.
- `wrapper()` takes a single type parameter, `wrapper<TRendered>` (here `ReactElement`). A wrapper's own optional `warm` is `(params, context)` — two arguments, no `search` — distinct from a route's three-argument `warm`.
- The boundary in the wrapper's JSX catches **render errors** only. Data errors never throw into React: a `StatusResponse` thrown from a `warm` becomes the committed location's `status`, so the wrapper (or any component) reads `useRoute().status` and conditionally renders error UI. Router handles data errors as state; React handles render errors — two channels, two mechanisms.

### Rationale

- consistent fallback behaviour across many routes
- keeps route declarations focused on `content` and data
- composes with layout wrappers (it prepends, so it nests outside them)

## Composition order

The array is applied **last entry first**: with `[A, B, C]`, routes pass through C, then B, then A. At runtime the nesting is the mirror image — the first entry's hook wrapper is outermost. Order the array deliberately.

```ts
import { createBrowserAdapter, createRouter } from "@canonical/router-core";

const router = createRouter(appRoutes, {
  adapter: createBrowserAdapter(),
  middleware: [withI18n("en"), withAuth("/login"), withTiming(report)],
  notFound: notFoundRoute,
});
```

What actually happens with `[withI18n("en"), withAuth("/login"), withTiming(report)]`:

1. **Build time runs right-to-left.** `withTiming` is applied first and wraps the route's original `warm`. `withAuth` is applied next — it checks `protectedPaths.has(currentRoute.url)` against the **un-prefixed** URL, which is exactly why its plain-path lookup works. `withI18n` is applied last: it rewrites the URL to `/:locale/...` after the other two already ran, so neither of them ever sees the prefixed URL.
2. **Runtime nests left-to-right.** On navigation, `withI18n`'s locale injection runs outermost, then `withAuth`'s guard, then — only if the auth check passes — `withTiming`'s timer around the original hook. For an unauthenticated visitor the redirect throws in the auth layer **before the timer ever starts**: the timer measures the route's own data work, not the guard.

If you moved `withI18n` to the **end** of the array, it would be applied first — `withAuth` would then see `/:locale/account` and its `protectedPaths` lookup would silently stop matching. If you moved `withTiming` to the **front**, its timer would wrap the guard and count redirects as "data time". The given order is the deliberate one: URL policy first in the array (outermost), instrumentation last (innermost, closest to the real work).

The boilerplate exports its chain as a `const` tuple and spreads it into both entries so client and server apply identical policy:

```ts
export const middleware = [withAuth("/login")] as const;

// client: createRouter(appRoutes, { adapter: createBrowserAdapter(), middleware: [...middleware], notFound: notFoundRoute })
// server: createRouter(appRoutes, { adapter: createServerAdapter(url), middleware: [...middleware], notFound: notFoundRoute })
```

## Rules of thumb

- return the original route unchanged when the rule does not apply
- capture and delegate to `currentRoute.warm` — never assume it exists, and never replace it with a hook the route never had
- there is no `fetch` field; `warm(params, search, context)` is the only route data hook
- `redirect()` throws (`never`) — call it for its side effect inside `warm`, never `return` it; thrown sync it applies before commit, thrown from an async hook it applies late (render never blocks)
- factor any decision a server also needs into a pure helper fed by the router's match (the `getAuthRedirectForMatch` pattern) so client and server share one policy
- prefer middleware for cross-cutting policy, wrappers (`wrapper()` + `group()`) for layout and shared UI
- document any redirect or URL-shape change clearly for consumers — middleware rewrites routes out from under the call site

## See a working example

The live auth middleware — `withAuth` and the pure `getAuthRedirectForMatch` companion — is in [apps/react/boilerplate-vite/src/routes.tsx](../../apps/react/boilerplate-vite/src/routes.tsx). The routes it transforms, including the Standard Schema v1 search schemas, are in [apps/react/boilerplate-vite/src/domains/account/routes.ts](../../apps/react/boilerplate-vite/src/domains/account/routes.ts) and [apps/react/boilerplate-vite/src/domains/marketing/routes.ts](../../apps/react/boilerplate-vite/src/domains/marketing/routes.ts). The client and server entries that apply the middleware are [src/client/entry.tsx](../../apps/react/boilerplate-vite/src/client/entry.tsx) and [src/server/entry.tsx](../../apps/react/boilerplate-vite/src/server/entry.tsx).

## Reference

- [Router core README](../../packages/runtime/router/README.md)
- [`applyMiddleware` source](../../packages/runtime/router/src/lib/applyMiddleware.ts)
- [Migrating to the pragma router](./MIGRATE_TO_PRAGMA_ROUTER.md)
