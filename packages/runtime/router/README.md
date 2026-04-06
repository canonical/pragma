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
    fetch: async ({ team }) => ({ team }),
    content: ({ data }) => `Account: ${data.team}`,
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

await router.load("/account/web");
router.navigate("home");
await router.prefetch("account", { params: { team: "web" } });
```

### 4. Render through your framework binding

The core package intentionally stops at route matching, loading, state, dehydration, and accessibility orchestration. For React rendering, pair it with `@canonical/router-react`.

## Mental model

- **Routes are flat.** Every route is declared with `route()`.
- **Wrappers are annotations.** Reuse layout, data, and error handling with `wrapper()` and `group()`.
- **Middleware is route-to-route transformation.** Use it to add auth, i18n, metrics, or shared wrapper policy before the router is created.
- **Routing is data-first.** `load()` resolves route data and wrapper data before you render.
- **SSR is built in.** `dehydrate()` and `hydrate()` preserve loader results across the server/client boundary.

## Progressive disclosure

### Basic route

```tsx
import { route } from "@canonical/router-core";

const settingsRoute = route({
  url: "/settings",
  content: () => "Settings",
});
```

### Route with data

```tsx
const userRoute = route({
  url: "/users/:id",
  fetch: async ({ id }) => {
    const response = await fetch(`https://example.com/users/${id}`);
    return response.json();
  },
  content: ({ data }) => `User: ${data.name}`,
  error: ({ status }) => `Failed with ${status}`,
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

### Redirects

```ts
import { redirect, route } from "@canonical/router-core";

const loginRequired = route({
  url: "/private",
  fetch: async () => {
    redirect("/login", 302);
  },
  content: () => "private",
});
```

## Middleware

Middleware runs once, before the router is created.

```ts
import type { AnyRoute } from "@canonical/router-core";

function withBasePath(basePath: string) {
  return <TRoute extends AnyRoute>(currentRoute: TRoute): TRoute => {
    return {
      ...currentRoute,
      url: `${basePath}${currentRoute.url}`,
    } as TRoute;
  };
}

const router = createRouter(routes, {
  middleware: [withBasePath("/app")],
});
```

See [docs/how-to-guides/ROUTER_MIDDLEWARE_COOKBOOK.md](../../../docs/how-to-guides/ROUTER_MIDDLEWARE_COOKBOOK.md) for more patterns.

## SSR and hydration

Use `load()` on the server, embed `dehydrate()`, then call `hydrate()` or pass `hydratedState` when you create the client router.

```ts
const serverRouter = createRouter(routes);
await serverRouter.load("/users/42");
const initialState = serverRouter.dehydrate();

const clientRouter = createRouter(routes, {
  hydratedState: initialState ?? undefined,
});
```

For a full React SSR flow, see [packages/react/router/README.md](../../react/router/README.md) and [apps/react/boilerplate-vite](../../../apps/react/boilerplate-vite).

## Accessibility

Track D adds optional browser-side accessibility orchestration:

- `ScrollManager`
- `FocusManager`
- `RouteAnnouncer`
- `ViewTransitionManager`

The router auto-wires these when browser globals are available, and you can override or disable them through `RouterOptions.accessibility`.

## Public API

### Functions and classes

- `applyMiddleware()`
- `createBrowserAdapter()`
- `createMemoryAdapter()`
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
