# @canonical/router-react

React bindings for `@canonical/router-core`. `@canonical/router-react` turns a core router into React context, hooks, links, outlets, and SSR helpers while preserving the flat-route model from the core package.

## Installation

```bash
bun add @canonical/router-core @canonical/router-react
```

Requires `react` and `react-dom`.

## Quick start

### 1. Define routes in core

```tsx
import { createRouter, route } from "@canonical/router-core";

export const routes = {
  home: route({
    url: "/",
    content: () => <h1>Home</h1>,
  }),
  docs: route({
    url: "/docs/:slug",
    content: ({ params }) => <h1>{params.slug}</h1>,
  }),
} as const;

export const router = createRouter(routes);
```

`@canonical/router-core` owns route definitions, matching, and typed navigation. `@canonical/router-react` layers React rendering and subscriptions on top.

Route authoring story, in short:

- define every route with `route()`
- give it a `url` pattern such as `/docs/:slug`
- optionally add `prefetch`, `content`, and `wrappers`
- create one router from the full flat route map
- let the router match incoming URLs — React renders the result

### 2. Provide the router and render the current match

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

`RouterProvider` makes the router instance available to hooks and components. `Outlet` renders the currently matched route subtree.

### 3. Navigate with typed links and observe router state

```tsx
import {
  Link,
  useNavigationState,
  useRoute,
  useRouterState,
  useSearchParam,
  useSearchParams,
} from "@canonical/router-react";

function Navigation() {
  const navigationState = useNavigationState();
  const location = useRoute();
  const status = useRouterState((state) => state.match?.status ?? 404);
  const tab = useSearchParam("tab");
  const search = useSearchParams();

  return (
    <nav>
      <Link to="home">Home</Link>
      <Link params={{ slug: "getting-started" }} to="docs">
        Docs
      </Link>
      <span>{navigationState}</span>
      <span>{status}</span>
      <span>{location.pathname}</span>
      <span>{tab ?? "overview"}</span>
      <span>{search.toString()}</span>
    </nav>
  );
}
```

All hooks and `Link` default to `RegisteredRouteMap`. Register your route map once in your router file to get full type inference without explicit generics:

```ts
declare module "@canonical/router-react" {
  interface RouterRegister {
    routes: typeof appRoutes;
  }
}
```

Explicit generics (`<typeof routes>`) still work as an escape hatch for multi-router apps or library code.

Important distinction:

- `useRouterState()` returns the full router state or a selected slice.
- `useRoute()` returns the current tracked location object.
- `useSearchParam()` returns the value of one query-string key.
- `useSearchParams()` returns all search params or a selected subset of keys.
- `useNavigationState()` returns the router's navigation lifecycle state.
- `useRouter()` returns the router instance itself.

## Data ownership

The router does not own data. `content()` receives `params` and `search` — not data. Components fetch their own data from their cache library (Relay, TanStack Query, SWR, etc.).

The optional `prefetch()` on routes is a fire-and-forget navigation-time hook. Use it to warm caches, preload assets, or run side effects before the component renders. It does not pass data to `content()`.

```tsx
const userRoute = route({
  url: "/users/:id",
  prefetch: async ({ id }) => {
    await queryClient.prefetchQuery(["user", id], () => fetchUser(id));
  },
  content: ({ params }) => <UserProfile id={params.id} />,
});

function UserProfile({ id }: { id: string }) {
  const { data } = useQuery(["user", id], () => fetchUser(id));
  return <h1>{data.name}</h1>;
}
```

## Error handling

The router does not ship an error boundary component. When `prefetch()` throws, the error propagates into the React render tree and is caught by the nearest React error boundary.

Use `StatusResponse` from `@canonical/router-core` to signal HTTP-like errors:

```tsx
import { StatusResponse } from "@canonical/router-core";

function ErrorFallback({ error }: { error: unknown }) {
  const status = error instanceof StatusResponse ? error.status : 500;

  if (status === 404) return <NotFound />;
  if (status === 401) return <LoginRedirect />;
  return <ErrorPage status={status} />;
}

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Sidebar />
      <ErrorBoundary fallbackRender={({ error }) => <ErrorFallback error={error} />}>
        {children}
      </ErrorBoundary>
    </div>
  );
}
```

The boilerplate reference app provides a complete `RouteErrorBoundary` implementation to copy and adapt.

## Creating routes and matching URLs

### Route creation

Each entry in the route map is a named call to `route()`.

```tsx
import { createRouter, route } from "@canonical/router-core";

const routes = {
  home: route({
    url: "/",
    content: () => <h1>Home</h1>,
  }),
  docs: route({
    url: "/docs/:slug",
    prefetch: async ({ slug }) => {
      await queryClient.prefetchQuery(["doc", slug], () => fetchDoc(slug));
    },
    content: ({ params }) => <DocPage slug={params.slug} />,
  }),
  accountSettings: route({
    url: "/account/settings",
    content: () => <h1>Settings</h1>,
  }),
} as const;

const router = createRouter(routes);
```

Important parts:

- the route-map key such as `docs` is the typed navigation name used by `Link` and `router.navigate()`
- the `url` string is the matcher used for incoming URLs
- `:slug` segments become typed route params
- `prefetch` runs at navigation time as a fire-and-forget hook
- `content` renders the matched route, receiving `params` and `search`

Routes stay flat even when the UI is nested. Shared layout lives in wrappers from the core package, not in a nested route tree.

## SSR

### Server side

Wire your own render tree using standard React SSR primitives. The router does not provide a convenience render function — you control the component tree:

```tsx
import { createRouter, createServerAdapter } from "@canonical/router-core";
import { Outlet, RouterProvider } from "@canonical/router-react";
import { renderToPipeableStream } from "react-dom/server";

app.get("*", async (req, res) => {
  const router = createRouter(routes, {
    adapter: createServerAdapter(req.url),
  });

  await router.load(req.url);

  const { pipe } = renderToPipeableStream(
    <RouterProvider router={router}>
      <Shell>
        <Outlet />
      </Shell>
    </RouterProvider>,
    {
      onShellReady() {
        res.setHeader("content-type", "text/html");
        pipe(res);
      },
    },
  );
});
```

### Client side

```tsx
import { createHydratedRouter, Outlet, RouterProvider } from "@canonical/router-react";

const router = createHydratedRouter(routes);

hydrateRoot(
  document,
  <RouterProvider router={router}>
    <Shell>
      <Outlet />
    </Shell>
  </RouterProvider>,
);
```

`createHydratedRouter()` reads the dehydrated navigation state from the browser window, creates a browser adapter, and resumes from the server-rendered route match.

## Progressive disclosure

### `Link`

`Link` builds typed hrefs from route names and optional route params, search data, and hash values. Primary-button clicks are intercepted and routed through the core router. Hover prefetches the destination.

```tsx
<Link<typeof routes> params={{ slug: "api" }} to="docs">
  API docs
</Link>
```

### `Outlet`

`Outlet` subscribes to router state, calls `router.render()`, and wraps the matched subtree in `Suspense`.

```tsx
<Outlet fallback={<p>Loading route…</p>} />
```

### Hooks

- `useRouter()` returns the router instance from context.
- `useRouterState()` is the power-user hook for subscribing to selected slices of `router.getState()`.
- `useRoute()` returns a tracked location proxy and rerenders only when an accessed location key changes.
- `useSearchParam()` subscribes to one query-string key.
- `useSearchParams()` subscribes either to the full query string or to a fixed set of keys.
- `useNavigationState()` subscribes to the router loading state.

Typical selection strategy:

- reach for `useNavigationState()` when you only need loading lifecycle
- reach for `useSearchParam()` for one query-string key
- reach for `useSearchParams()` for a fixed key set or the full query string
- reach for `useRoute()` for pathname, hash, or full URL reads
- reach for `useRouterState()` when you need `match`, `navigation`, or other advanced state in one selector

## Boilerplate reference

The reference integration lives in [apps/react/boilerplate-vite](../../../apps/react/boilerplate-vite). It shows:

- domain-colocated route modules
- a shell-as-route-provider layout
- SSR + hydration
- hover prefetch
- auth middleware redirect flow
- error handling with `StatusResponse` and React error boundaries

## Public API

### Components and helpers

- `createHydratedRouter()` — create a browser-backed router that resumes from dehydrated state.
- `Link` — render a typed anchor that navigates and prefetches through the router.
- `Outlet` — render the current matched subtree.
- `RouterProvider` — place a router instance into React context.
- `useNavigationState()` — subscribe to the navigation lifecycle state.
- `useRoute()` — subscribe to a tracked location object.
- `useRouter()` — read the router instance from context.
- `useRouterState()` — subscribe to the full router state or a selected slice.
- `useSearchParam()` — subscribe to one search-param key.
- `useSearchParams()` — subscribe to all search params or a selected key set.

### Reference docs

- Full API reference: [docs/references/ROUTER_API.md](../../../docs/references/ROUTER_API.md)
- Migration guide: [docs/how-to-guides/MIGRATE_FROM_TANSTACK_ROUTER.md](../../../docs/how-to-guides/MIGRATE_FROM_TANSTACK_ROUTER.md)
- Middleware cookbook: [docs/how-to-guides/ROUTER_MIDDLEWARE_COOKBOOK.md](../../../docs/how-to-guides/ROUTER_MIDDLEWARE_COOKBOOK.md)
