# Router middleware cookbook

Middleware in `@canonical/router-core` transforms routes once, before the router is created. Use middleware when a concern should apply consistently across a route map without changing every route declaration by hand.

## When to use middleware

Use middleware for:

- auth redirects
- locale prefixes or locale-aware fetch setup
- timing or tracing
- shared wrapper or error-boundary policy

Avoid middleware when the concern is only relevant to a single route. In that case, keep it in the route `fetch()` or `content`.

## Shape of a middleware

```ts
import type { AnyRoute } from "@canonical/router-core";

function middlewareExample() {
  return <TRoute extends AnyRoute>(currentRoute: TRoute): TRoute => {
    return currentRoute;
  };
}
```

## `withAuth(loginPath)`

Use this when a route should redirect anonymous visitors before loading protected data.

```ts
import { redirect, type AnyRoute } from "@canonical/router-core";

function withAuth(loginPath: string) {
  const protectedPaths = new Set(["/account", "/settings"]);

  return <TRoute extends AnyRoute>(currentRoute: TRoute): TRoute => {
    if (!protectedPaths.has(currentRoute.url)) {
      return currentRoute;
    }

    const currentFetch = currentRoute.fetch;

    return {
      ...currentRoute,
      fetch: async (params, search, context) => {
        const record = search as Record<string, unknown>;

        if (record.auth !== "1") {
          const from = currentRoute.render((params ?? {}) as Record<string, string>);
          redirect(`${loginPath}?from=${encodeURIComponent(from)}`, 302);
        }

        return currentFetch?.(params, search, context);
      },
    } as TRoute;
  };
}
```

### Rationale

- keeps auth policy centralized
- preserves typed route helpers
- avoids duplicating redirect logic in every protected route

## `withI18n(defaultLocale)`

Use this when your app prefixes routes or injects locale context into loaders.

```ts
import type { AnyRoute } from "@canonical/router-core";

function withI18n(defaultLocale: string) {
  return <TRoute extends AnyRoute>(currentRoute: TRoute): TRoute => {
    return {
      ...currentRoute,
      url: `/:locale${currentRoute.url === "/" ? "" : currentRoute.url}`,
      fetch: currentRoute.fetch
        ? async (params, search, context) => {
            const locale = params.locale ?? defaultLocale;
            return currentRoute.fetch?.(
              params,
              { ...search, locale },
              context,
            );
          }
        : undefined,
    } as TRoute;
  };
}
```

### Rationale

- one place to enforce locale-aware URLs
- useful for boilerplates and generators
- works with both route fetches and wrapper fetches

## `withTiming(report)`

Use this to measure route loader duration.

```ts
import type { AnyRoute } from "@canonical/router-core";

function withTiming(
  report: (event: { route: string; durationMs: number }) => void,
) {
  return <TRoute extends AnyRoute>(currentRoute: TRoute): TRoute => {
    if (!currentRoute.fetch) {
      return currentRoute;
    }

    return {
      ...currentRoute,
      fetch: async (params, search, context) => {
        const startedAt = performance.now();

        try {
          return await currentRoute.fetch?.(params, search, context);
        } finally {
          report({
            durationMs: performance.now() - startedAt,
            route: currentRoute.url,
          });
        }
      },
    } as TRoute;
  };
}
```

### Rationale

- keeps instrumentation orthogonal to route logic
- easy to disable in tests
- works for analytics, tracing, and SLO dashboards

## `withErrorBoundary(wrapperDef)`

Use this when multiple routes should share the same wrapper-level error experience.

```ts
import { group, wrapper, type AnyRoute } from "@canonical/router-core";

const shellBoundary = wrapper({
  id: "shell:error-boundary",
  component: ({ children }) => children,
  error: ({ status }) => `Shell error ${status}`,
});

function withErrorBoundary() {
  return <TRoute extends AnyRoute>(currentRoute: TRoute): TRoute => {
    return {
      ...currentRoute,
      wrappers: [shellBoundary, ...currentRoute.wrappers],
    } as TRoute;
  };
}
```

### Rationale

- consistent fallback behavior
- keeps route declarations focused on content and data
- can be layered with layout wrappers

## Composition order

Middleware runs in array order. Start with broad URL policy, then auth, then instrumentation.

```ts
const router = createRouter(routes, {
  middleware: [withI18n("en"), withAuth("/login"), withTiming(report)],
});
```

## Rules of thumb

- return the original route unchanged when the rule does not apply
- preserve `currentRoute.fetch` when wrapping loader logic
- prefer middleware for cross-cutting policy, wrappers for layout and shared UI
- document any redirect or URL-shape changes clearly for consumers

## Reference implementation

The live auth example is in [apps/react/boilerplate-vite/src/routes.tsx](../../apps/react/boilerplate-vite/src/routes.tsx).
