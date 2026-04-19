# @canonical/router-core

Framework-agnostic routing primitives for Canonical apps. `@canonical/router-core` gives you flat route definitions, wrapper composition, typed navigation helpers, SSR dehydration, middleware hooks, and accessibility orchestration without locking you into a specific view layer.

## Installation

```bash
bun add @canonical/router-core
```

## Quick start

### 1. Define routes

```tsx
import { createRouter, route } from "@canonical/router-core";

const routes = {
  home: route({
    url: "/",
    content: () => "Home",
  }),
  account: route({
    url: "/account/:team",
    content: ({ params }) => `Account: ${params.team}`,
  }),
} as const;
```

### 2. Create a router

```ts
const router = createRouter(routes);
```

### 3. Use typed helpers

```ts
router.buildPath("account", { params: { team: "web" } });
// "/account/web"

router.navigate("home");
await router.prefetch("account", { params: { team: "web" } });
```

### 4. Render through your framework binding

The core package intentionally stops at route matching, state, dehydration, and accessibility orchestration. For React rendering, pair it with `@canonical/router-react`.

## Mental model

- **Routes are flat.** Every route is declared with `route()`.
- **Wrappers are annotations.** Reuse layout with `wrapper()` and `group()`.
- **Middleware is route-to-route transformation.** Use it to add auth, i18n, metrics, or shared wrapper policy. Middleware runs once, before the router is created.
- **`prefetch()` is fire-and-forget.** It warms caches, preloads assets, or runs side effects at navigation time. It does not provide data to `content()` — components own their data via their cache library.
- **SSR is built in.** `dehydrate()` preserves navigation state across the server/client boundary.

## Progressive disclosure

### Basic route

```tsx
import { route } from "@canonical/router-core";

const settingsRoute = route({
  url: "/settings",
  content: () => "Settings",
});
```

### Route with prefetch

`prefetch()` is a fire-and-forget navigation-time hook. Use it to warm a cache, preload assets, fire analytics, or run permission checks. It does not return data to the component.

```tsx
const userRoute = route({
  url: "/users/:id",
  prefetch: async ({ id }, _search, { signal }) => {
    await queryClient.prefetchQuery({
      queryKey: ["user", id],
      queryFn: () => fetchUser(id),
      signal,
    });
  },
  content: ({ params }) => `User: ${params.id}`,
});
```

### Wrapper composition

```tsx
import { group, route, wrapper } from "@canonical/router-core";

const appShell = wrapper({
  id: "app:shell",
  component: ({ children }) => `<main>${String(children)}</main>`,
});

const [dashboardRoute, reportsRoute] = group(appShell, [
  route({ url: "/dashboard", content: () => "Dashboard" }),
  route({ url: "/reports", content: () => "Reports" }),
] as const);
```

### Error handling

The router does not ship an error boundary component. Errors from `prefetch()` are thrown into the React render tree and caught by standard React error boundaries. Use `StatusResponse` to signal HTTP-like errors:

```tsx
import { StatusResponse, route } from "@canonical/router-core";

const protectedRoute = route({
  url: "/admin",
  prefetch: async () => {
    if (!isAuthenticated()) {
      throw new StatusResponse(401);
    }
  },
  content: () => "Admin panel",
});
```

In your React tree, catch these with any error boundary:

```tsx
import { StatusResponse } from "@canonical/router-core";

function ErrorFallback({ error }) {
  const status = error instanceof StatusResponse ? error.status : 500;
  return <ErrorPage status={status} />;
}
```

### Redirects

```ts
import { redirect, route } from "@canonical/router-core";

const loginRequired = route({
  url: "/private",
  prefetch: async () => {
    redirect("/login", 302);
  },
  content: () => "private",
});
```

## Middleware

Middleware runs once, before the router is created. Apply it to route definitions with `applyMiddleware()`:

```ts
import { applyMiddleware, createRouter } from "@canonical/router-core";
import type { AnyRoute } from "@canonical/router-core";

function withBasePath(basePath: string) {
  return <TRoute extends AnyRoute>(currentRoute: TRoute): TRoute => {
    return {
      ...currentRoute,
      url: `${basePath}${currentRoute.url}`,
    } as TRoute;
  };
}

const routes = applyMiddleware([withBasePath("/app")], rawRoutes);
const router = createRouter(routes);
```

See [docs/how-to-guides/ROUTER_MIDDLEWARE_COOKBOOK.md](../../../docs/how-to-guides/ROUTER_MIDDLEWARE_COOKBOOK.md) for more patterns.

## SSR and hydration

The router dehydrates navigation state only (matched route, params, search, URL). Data dehydration is the cache library's responsibility.

```ts
const serverRouter = createRouter(routes);
await serverRouter.load("/users/42");
const navigationState = serverRouter.dehydrate();

const clientRouter = createRouter(routes, {
  hydratedState: navigationState ?? undefined,
});
```

For a full React SSR flow, see [packages/react/router/README.md](../../react/router/README.md) and [apps/react/boilerplate-vite](../../../apps/react/boilerplate-vite).

## Platform adapters

The router uses platform adapters to interact with the browser's URL.

- `createBrowserAdapter()` — auto-detects the best API: uses the Navigation API (`window.navigation`) when available, falls back to the History API (`pushState` / `popstate`) for older browsers.
- `createNavigationAdapter()` — explicitly use the Navigation API. Baseline Newly Available since January 2026.
- `createHistoryAdapter()` — explicitly use the History API.
- `createMemoryAdapter()` — in-memory adapter for testing.
- `createServerAdapter()` — static URL for server-side rendering.

```ts
import { createRouter, createMemoryAdapter } from "@canonical/router-core";

const testRouter = createRouter(routes, {
  adapter: createMemoryAdapter("/users/42"),
});
```

## Accessibility

The router auto-wires browser-side accessibility orchestration:

- `ScrollManager` — saves/restores scroll positions across navigations
- `FocusManager` — moves focus to `<h1>` on route change
- `RouteAnnouncer` — announces route changes to screen readers
- `ViewTransitionManager` — wraps navigations in View Transitions when available

Override or disable them through `RouterOptions.accessibility`.

## Public API

### Functions and classes

- `applyMiddleware()`
- `createBrowserAdapter()`
- `createHistoryAdapter()`
- `createMemoryAdapter()`
- `createNavigationAdapter()`
- `createRouter()`
- `createRouterStore()`
- `createServerAdapter()`
- `createSubject()`
- `createTrackedLocation()`
- `group()`
- `redirect()`
- `route()`
- `wrapper()`
- `FocusManager`
- `RouteAnnouncer`
- `ScrollManager`
- `ViewTransitionManager`
- `Redirect`
- `StatusResponse`

### Reference docs

- Full API reference: [docs/references/ROUTER_API.md](../../../docs/references/ROUTER_API.md)
- Migration guide: [docs/how-to-guides/MIGRATE_FROM_TANSTACK_ROUTER.md](../../../docs/how-to-guides/MIGRATE_FROM_TANSTACK_ROUTER.md)
- Middleware cookbook: [docs/how-to-guides/ROUTER_MIDDLEWARE_COOKBOOK.md](../../../docs/how-to-guides/ROUTER_MIDDLEWARE_COOKBOOK.md)
