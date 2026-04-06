# Migrate from TanStack Router to `@canonical/router-react`

This guide maps the most common TanStack Router concepts to `@canonical/router-core` and `@canonical/router-react`.

## When this migration is a good fit

Choose the Canonical router stack when you want:

- flat route definitions instead of nested file or tree APIs
- wrapper composition that is explicit and reusable across route groups
- lightweight typed navigation helpers
- SSR dehydration without a framework-specific route compiler
- a small surface area you can embed into existing apps and generators

## Concept mapping

| TanStack Router | Canonical router |
|---|---|
| `createRootRoute`, `createRoute`, route tree | `route()` plus a flat `RouteMap` |
| layout routes | `wrapper()` + `group()` |
| `createRouter()` | `createRouter()` |
| `Link` | `Link` |
| `Outlet` | `Outlet` |
| loaders | route `fetch()` |
| route component | route `content` |
| route error component | route `error` |
| redirects | static redirect routes or `redirect()` |
| before-load auth checks | middleware such as `withAuth()` |
| dehydrated loader state | `dehydrate()` / `hydratedState` / `createHydratedRouter()` |

## 1. Replace the route tree with flat routes

### TanStack Router

```tsx
const rootRoute = createRootRoute({
  component: RootLayout,
});

const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/account/$team",
  loader: ({ params }) => fetchTeam(params.team),
  component: AccountPage,
});

const routeTree = rootRoute.addChildren([accountRoute]);
```

### Canonical router

```tsx
import { createRouter, route } from "@canonical/router-core";

const routes = {
  account: route({
    url: "/account/:team",
    fetch: async ({ team }) => fetchTeam(team),
    content: ({ data }) => <AccountPage data={data} />,
  }),
} as const;

const router = createRouter(routes);
```

## 2. Replace layout routes with wrappers

### TanStack Router

A parent route often carries layout and shared loader concerns.

### Canonical router

Move that concern into a wrapper and apply it to a flat route list.

```tsx
import { group, route, wrapper } from "@canonical/router-core";

const appShell = wrapper({
  id: "app:shell",
  component: ({ children }) => <Shell>{children}</Shell>,
  fetch: async () => fetchViewer(),
});

const [dashboardRoute, reportsRoute] = group(appShell, [
  route({ url: "/dashboard", content: () => <Dashboard /> }),
  route({ url: "/reports", content: () => <Reports /> }),
] as const);
```

## 3. Move loaders to `fetch()`

TanStack Router loaders become route or wrapper `fetch()` functions.

```tsx
const userRoute = route({
  url: "/users/:id",
  fetch: async ({ id }, search, context) => fetchUser(id, search, context),
  content: ({ data }) => <UserPage data={data} />,
});
```

## 4. Move route components to `content`

`component` maps directly to `content`.

```tsx
const settingsRoute = route({
  url: "/settings",
  content: () => <SettingsPage />,
});
```

## 5. Replace `beforeLoad` with middleware or wrapper fetches

If your TanStack route used `beforeLoad` for auth or locale setup, prefer one of these:

- **middleware** when the concern should be applied at router-creation time
- **wrapper fetch** when the concern belongs to a layout boundary
- **route fetch** when the concern is route-local

### Example: auth

```tsx
import { redirect, type AnyRoute } from "@canonical/router-core";

function withAuth(loginPath: string) {
  return <TRoute extends AnyRoute>(currentRoute: TRoute): TRoute => {
    if (currentRoute.url !== "/account") {
      return currentRoute;
    }

    return {
      ...currentRoute,
      fetch: async (params, search, context) => {
        if (search.auth !== "1") {
          redirect(`${loginPath}?from=/account`, 302);
        }

        return currentRoute.fetch?.(params, search, context);
      },
    } as TRoute;
  };
}
```

See [ROUTER_MIDDLEWARE_COOKBOOK.md](ROUTER_MIDDLEWARE_COOKBOOK.md) for more patterns.

## 6. Replace router context with `RouterProvider`

```tsx
import { Outlet, RouterProvider } from "@canonical/router-react";

export default function Application() {
  return (
    <RouterProvider router={router}>
      <Outlet />
    </RouterProvider>
  );
}
```

## 7. Replace TanStack `Link` with Canonical `Link`

```tsx
import { Link } from "@canonical/router-react";

<Link<typeof routes> params={{ team: "web" }} to="account">
  Account
</Link>
```

This keeps route-name typing and adds hover prefetch.

## 8. SSR migration

### TanStack approach

- run loaders on the server
- serialize router state
- hydrate on the client

### Canonical approach

The same flow exists, but is explicit:

```tsx
const serverRouter = createRouter(routes);
await serverRouter.load("/account/web");
const initialData = serverRouter.dehydrate();
```

Client side:

```tsx
const router = createHydratedRouter(routes);
```

Or pass `hydratedState` manually to `createRouter()`.

## 9. Error boundaries

TanStack route error boundaries map to:

- route-level `error`
- wrapper-level `error`

Use route `error` when the fallback is local to one route. Use wrapper `error` when the fallback belongs to a layout or shell.

## Migration checklist

- [ ] Flatten the route tree into a `RouteMap`
- [ ] Convert parent/layout routes into wrappers
- [ ] Move loaders into `fetch()`
- [ ] Move route components into `content`
- [ ] Move redirects to static redirect routes or `redirect()`
- [ ] Replace `Link`/`Outlet` imports with `@canonical/router-react`
- [ ] Add `RouterProvider`
- [ ] Replace SSR dehydration with `dehydrate()` and `createHydratedRouter()`
- [ ] Move auth/i18n/timing concerns into middleware or wrapper fetches

## Reference implementation

See [apps/react/boilerplate-vite](../../apps/react/boilerplate-vite) for a working SSR React example using the Canonical router stack.
