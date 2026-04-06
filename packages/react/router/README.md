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
    fetch: async ({ slug }) => ({ slug }),
    content: ({ data }) => <h1>{data.slug}</h1>,
  }),
} as const;

export const router = createRouter(routes);
```

`@canonical/router-core` owns route definitions, matching, loading, and typed
navigation. `@canonical/router-react` layers React rendering and subscriptions
on top of that router instance.

Route authoring story, in short:

- define every route with `route()`
- give it a `url` pattern such as `/docs/:slug`
- optionally add `fetch`, `content`, `error`, and `wrappers`
- create one router from the full flat route map
- let the router match incoming URLs and resolve route data before React renders

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

`RouterProvider` makes the router instance available to hooks and components.
`Outlet` renders the currently matched route subtree.

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

## Consumer-first flow

1. Define routes with `route()` in `@canonical/router-core`.
2. Create a router with `createRouter()` or `createHydratedRouter()`.
3. Pass the router to `RouterProvider`.
4. Render matches with `Outlet`.
5. Navigate with `Link`, `useRouter()`, `useRouterState()`, `useRoute()`, `useSearchParam()`, `useSearchParams()`, and `useNavigationState()`.

## Creating routes and matching URLs

Two recurring stories sit below the React layer: authoring routes and matching
URLs.

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
    fetch: async ({ slug }) => ({ slug }),
    content: ({ data }) => <h1>{data.slug}</h1>,
  }),
  accountSettings: route({
    url: "/account/settings",
    content: () => <h1>Settings</h1>,
  }),
} as const;

const router = createRouter(routes);
```

Important parts of route creation:

- the route-map key such as `docs` is the typed navigation name used by `Link`
  and `router.navigate()`
- the `url` string is the matcher used for incoming URLs
- `:slug` segments become typed route params
- `fetch` runs during loading and receives those params
- `content` renders once the route has matched and data has been resolved

Routes stay flat even when the UI is nested. Shared layout and shared data live
in wrappers from the core package, not in a nested route tree.

### Matching story

Matching happens in the core router before `Outlet` renders.

```ts
await router.load("/docs/getting-started?tab=api");

const state = router.getState();

state.match?.name; // "docs"
state.location.pathname; // "/docs/getting-started"
state.location.searchParams.get("tab"); // "api"
```

Practical consequences:

- `createRouter()` owns route ranking and URL matching
- the current match is stored in router state
- `Outlet` renders whatever route the router matched most recently
- `useRoute()` lets React read the matched location
- `useRouterState()` lets React read the match object itself when you need route
  status, params, or advanced state

If no route matches, the router falls back to its configured not-found behavior.
The React bindings do not implement matching themselves; they subscribe to the
core router's result.

### Matching in components

In React, you usually read matching results rather than perform matching
manually.

```tsx
function RouteDebug() {
  const location = useRoute<typeof routes>();
  const matchName = useRouterState<typeof routes>((state) => state.match?.name ?? "not-found");

  return (
    <dl>
      <dt>match</dt>
      <dd>{matchName}</dd>
      <dt>pathname</dt>
      <dd>{location.pathname}</dd>
    </dl>
  );
}
```

This is the recommended split:

- define and match routes in `@canonical/router-core`
- render and subscribe in `@canonical/router-react`

## SSR

### Server side

```tsx
import { createRouter, route } from "@canonical/router-core";
import { renderToStream } from "@canonical/router-react";

const router = createRouter({
  home: route({ url: "/", content: () => <h1>Home</h1> }),
});

const result = await renderToStream(router, "/");
```

`renderToStream()` loads the URL into the router, renders the matched route tree, and returns:

- `stream`
- `loadResult`
- `initialData`
- `bootstrapScriptContent`

`bootstrapScriptContent` contains the dehydrated router payload as an inline
script assignment. `initialData` contains the same payload as plain JSON in case
your SSR pipeline needs to inject it manually.

### Client side

```tsx
import { createHydratedRouter, Outlet, RouterProvider } from "@canonical/router-react";

const router = createHydratedRouter(routes);

hydrateRoot(
  document,
  <RouterProvider router={router}>
    <Outlet />
  </RouterProvider>,
);
```

`createHydratedRouter()` reads the dehydrated state from the browser window,
creates a browser adapter, and resumes from the server-rendered route match
instead of loading the initial URL a second time.

## Progressive disclosure

### `Link`

`Link` builds typed hrefs from route names and optional route params, search
data, and hash values. Primary-button clicks are intercepted and routed through
the core router. Hover prefetches the destination.

```tsx
<Link<typeof routes> params={{ slug: "api" }} to="docs">
  API docs
</Link>
```

### `Outlet`

`Outlet` subscribes to router state, calls `router.render()`, and wraps the
matched subtree in `Suspense`.

```tsx
<Outlet fallback={<p>Loading route…</p>} />
```

### Hooks

- `useRouter()` returns the router instance from context.
- `useRouterState()` is the power-user hook for subscribing to selected slices
  of `router.getState()`.
- `useRoute()` returns a tracked location proxy and rerenders only when an
  accessed location key changes.
- `useSearchParam()` subscribes to one query-string key.
- `useSearchParams()` subscribes either to the full query string or to a fixed
  set of keys.
- `useNavigationState()` subscribes to the router loading state.

Typical selection strategy:

- reach for `useNavigationState()` when you only need loading lifecycle
- reach for `useSearchParam()` for one query-string key
- reach for `useSearchParams()` for a fixed key set or the full query string
- reach for `useRoute()` for pathname, hash, or full URL reads
- reach for `useRouterState()` when you need `match`, `navigation`, or other
  advanced state in one selector

## Boilerplate reference

The reference integration lives in [apps/react/boilerplate-vite](../../../apps/react/boilerplate-vite). It shows:

- domain-colocated route modules
- a shell-as-route-provider layout
- SSR + hydration
- hover prefetch
- auth middleware redirect flow

## Public API

### Components and helpers

- `createHydratedRouter()` — create a browser-backed router that resumes from
  dehydrated state.
- `Link` — render a typed anchor that navigates and prefetches through the
  router.
- `Outlet` — render the current matched subtree.
- `RouterProvider` — place a router instance into React context.
- `renderToStream()` — load a URL and stream the rendered route tree.
- `useNavigationState()` — subscribe to the navigation lifecycle state.
- `useRoute()` — subscribe to a tracked location object.
- `useRouter()` — read the router instance from context.
- `useRouterState()` — subscribe to the full router state or a selected slice.
- `useSearchParam()` — subscribe to one search-param key.
- `useSearchParams()` — subscribe to all search params or a selected key set.

### Types

- `AnyReactRouter` — widened router type used by the React bindings.
- `RouterProviderProps` — props for `RouterProvider`.
- `LinkBuildOptions` — route params, search, and hash used to build links.
- `LinkProps` — typed props for `Link`.
- `OutletProps` — optional fallback for `Outlet`.
- `RenderToStreamOptions` — options for streamed server rendering.
- `RenderToStreamResult` — stream plus dehydration payload and load result.
- `HydrationWindow` — minimal window-like object used during hydration.
- `CreateHydratedRouterOptions` — router options accepted by
  `createHydratedRouter()`.
- `CreateHydratedRouterWindow` — alias for the hydration window shape.
- `HydratedNavigationState` — alias for the router navigation state.
- `SearchParamValues` — mapped values returned by keyed `useSearchParams()`.
- `UseRouterStateOptions` — selector equality options for `useRouterState()`.

### Reference docs

- Full API reference: [docs/references/ROUTER_API.md](../../../docs/references/ROUTER_API.md)
- Migration guide: [docs/how-to-guides/MIGRATE_FROM_TANSTACK_ROUTER.md](../../../docs/how-to-guides/MIGRATE_FROM_TANSTACK_ROUTER.md)
- Middleware cookbook: [docs/how-to-guides/ROUTER_MIDDLEWARE_COOKBOOK.md](../../../docs/how-to-guides/ROUTER_MIDDLEWARE_COOKBOOK.md)
