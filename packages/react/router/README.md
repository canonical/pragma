# @canonical/router-react

React bindings for `@canonical/router-core`. `@canonical/router-react` turns a core router into React context, hooks, links, outlets, and SSR helpers while preserving the flat-route model from the core package.

## Installation

```bash
bun add @canonical/router-core @canonical/router-react
```

Peer dependencies: `react` and `react-dom`.

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

### 2. Provide the router

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

### 3. Navigate with typed links and hooks

```tsx
import { Link, useNavigationState, useRoute } from "@canonical/router-react";

function Navigation() {
  const state = useNavigationState();
  const docsRoute = useRoute<typeof routes, "docs">("docs");

  return (
    <nav>
      <Link<typeof routes> to="home">Home</Link>
      <Link<typeof routes> params={{ slug: "getting-started" }} to="docs">
        Docs
      </Link>
      <span>{state}</span>
      <span>{docsRoute?.params.slug}</span>
    </nav>
  );
}
```

## Consumer-first flow

1. Define routes with `route()` in `@canonical/router-core`.
2. Create a router with `createRouter()` or `createHydratedRouter()`.
3. Pass the router to `RouterProvider`.
4. Render matches with `Outlet` or `ServerRouter`.
5. Navigate with `Link`, `useRouter()`, `useRoute()`, `useSearchParam()`, and `useNavigationState()`.

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

`renderToStream()` loads the route, renders `ServerRouter`, and returns:

- `stream`
- `loadResult`
- `initialData`
- `bootstrapScriptContent`

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

## Progressive disclosure

### `Link`

`Link` builds typed hrefs from route names and prefetches on hover.

```tsx
<Link<typeof routes> params={{ slug: "api" }} to="docs">
  API docs
</Link>
```

### `Outlet`

`Outlet` subscribes to router state and renders the matched route through Suspense.

```tsx
<Outlet fallback={<p>Loading route…</p>} />
```

### Hooks

- `useRouter()` returns the router instance from context.
- `useRoute()` subscribes to the current matched route.
- `useSearchParam()` subscribes to one query-string key.
- `useNavigationState()` subscribes to the router loading state.

## Boilerplate reference

The reference integration lives in [apps/react/boilerplate-vite](../../../apps/react/boilerplate-vite). It shows:

- domain-colocated route modules
- a shell-as-route-provider layout
- SSR + hydration
- hover prefetch
- auth middleware redirect flow

## Public API

### Components and helpers

- `createHydratedRouter()`
- `Link`
- `Outlet`
- `RouterProvider`
- `renderToStream()`
- `ServerRouter`
- `useNavigationState()`
- `useRoute()`
- `useRouter()`
- `useSearchParam()`

### Types

- `AnyReactRouter`
- `RouterProviderProps`
- `LinkBuildOptions`
- `LinkProps`
- `OutletProps`
- `ServerRouterProps`
- `RenderToStreamOptions`
- `RenderToStreamResult`
- `HydrationWindow`
- `CreateHydratedRouterOptions`
- `CreateHydratedRouterWindow`
- `HydratedNavigationState`

### Reference docs

- Full API reference: [docs/references/ROUTER_API.md](../../../docs/references/ROUTER_API.md)
- Migration guide: [docs/how-to-guides/MIGRATE_FROM_TANSTACK_ROUTER.md](../../../docs/how-to-guides/MIGRATE_FROM_TANSTACK_ROUTER.md)
- Middleware cookbook: [docs/how-to-guides/ROUTER_MIDDLEWARE_COOKBOOK.md](../../../docs/how-to-guides/ROUTER_MIDDLEWARE_COOKBOOK.md)
