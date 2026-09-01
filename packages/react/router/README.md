# @canonical/router-react

React bindings for `@canonical/router-core`. `@canonical/router-react` turns a core router into React context, hooks, links, outlets, and SSR helpers while preserving the flat-route model from the core package.

> **Stability: pre-1.0 / experimental.** The API is still consolidating and breaking changes may land between minor versions; the CHANGELOG and conventional-commit history are the migration record. The design positions behind the API are documented in the core package's [Design rationale](../../runtime/router/README.md#design-rationale).

## Installation

```bash
bun add @canonical/router-core @canonical/router-react
```

Requires `react` and `react-dom`.

## Quick start

### 1. Define routes and a router in core

```tsx
import {
  createBrowserAdapter,
  createRouter,
  route,
} from "@canonical/router-core";

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

export const router = createRouter(routes, {
  adapter: createBrowserAdapter(),
});
```

`@canonical/router-core` owns route definitions, matching, and typed navigation. `@canonical/router-react` layers React rendering and subscriptions on top.

Route authoring story, in short:

- define every route with `route()`
- give it a `url` pattern such as `/docs/:slug`
- optionally add `warm`, `content`, and `wrappers`
- create one router from the full flat route map, with an adapter
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
  useSearchParam,
  useSearchParams,
} from "@canonical/router-react";

function Navigation() {
  const navigationState = useNavigationState();
  const location = useRoute();
  const tab = useSearchParam("tab");
  const search = useSearchParams();

  return (
    <nav>
      <Link to="home">Home</Link>
      <Link params={{ slug: "getting-started" }} to="docs">
        Docs
      </Link>
      <span>{navigationState}</span>
      <span>{location.status}</span>
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
    routes: typeof routes;
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

The optional `warm()` on routes is a fire-and-forget navigation-time hook. Use it to warm caches, preload assets, or run side effects before the component renders. It does not pass data to `content()` — the component's cache hook finds the data already warm. (Why this is the design, and why loader-data-as-props is rejected, is spelled out in the core [Design rationale](../../runtime/router/README.md#design-rationale).)

```tsx
const userRoute = route({
  url: "/users/:id",
  warm: async ({ id }) => {
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

Errors travel through two separate channels. Knowing which one you are in tells you which tool to reach for.

### Channel 1 — data errors are state, not exceptions

The router commits every data failure as a status on the location: an unmatched URL is a 404, a rejected search schema is a 400, a `StatusResponse`/`Response` thrown from `warm()` carries its own status, and any other throw during a load becomes a 500. **None of these are thrown into React** — a `StatusResponse` thrown during a load never reaches an error boundary; it becomes `location.status`.

The bridge into React is one property read: `useRoute().status`. The location object is tracked, so a component reading `status` re-renders only when the status changes:

```tsx
import { useRoute } from "@canonical/router-react";

function RouteStatusGate({ children }: { children: React.ReactNode }) {
  const { status } = useRoute();

  if (status === 404) return <NotFoundPage />;
  if (status === 401) return <LoginPrompt />;
  if (status >= 400) return <ErrorPage status={status} />;

  return <>{children}</>;
}

// Wrap the outlet once, near the top of the tree:
// <RouterProvider router={router}>
//   <RouteStatusGate>
//     <Outlet />
//   </RouteStatusGate>
// </RouterProvider>
```

### Channel 2 — render errors belong to React

A component that throws while rendering (including a suspense cache read that rejects) is React's concern, handled by an ordinary error boundary. The router deliberately does not ship one — error UI is application-specific. A complete boundary, inline:

```tsx
import { useRoute } from "@canonical/router-react";
import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  readonly children: ReactNode;
  readonly fallback: (error: unknown) => ReactNode;
}

interface ErrorBoundaryState {
  readonly error: unknown | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error };
  }

  render(): ReactNode {
    return this.state.error !== null
      ? this.props.fallback(this.state.error)
      : this.props.children;
  }
}

// A plain boundary sticks in its error state after the user navigates away.
// Key it by the location so navigation remounts it fresh:
function RouteErrorGate({ children }: { children: ReactNode }) {
  const { href } = useRoute();

  return (
    <ErrorBoundary key={href} fallback={(error) => <CrashPage error={error} />}>
      {children}
    </ErrorBoundary>
  );
}
```

Compose the two channels in one place — status gate outside, render boundary inside — and every route gets both behaviors for free.

## Search param mutation

Update search params from any component via the router instance:

```tsx
function FilterBar() {
  const router = useRouter();
  const sort = useSearchParam("sort");

  return (
    <select
      value={sort ?? "name"}
      onChange={(event) => {
        router.setSearchParams({ sort: event.target.value }, { replace: true });
      }}
    >
      <option value="name">Name</option>
      <option value="date">Date</option>
    </select>
  );
}
```

`setSearchParams` merges into the current URL. Set a key to `null` to remove it. Pass `{ replace: true }` to replace the history entry instead of pushing.

## Navigation blocking

`useBlocker()` prevents navigation when the component has unsaved state. The hook returns a state object — the consumer controls the confirmation UI, and the hook re-renders the moment a navigation is blocked:

```tsx
import { useBlocker } from "@canonical/router-react";
import { useState } from "react";

function EditForm() {
  const [isDirty, setIsDirty] = useState(false);
  const blocker = useBlocker(isDirty);

  return (
    <>
      <form onChange={() => setIsDirty(true)}>
        <textarea placeholder="Start typing to mark as dirty..." />
        <button
          type="submit"
          onClick={(event) => {
            event.preventDefault();
            setIsDirty(false);
          }}
        >
          Save
        </button>
      </form>

      {blocker.state === "blocked" && (
        <div role="alertdialog" aria-modal="true">
          <h2>Unsaved changes</h2>
          <p>You have unsaved changes. Do you want to leave this page?</p>
          <button onClick={blocker.cancel}>Stay on page</button>
          <button onClick={blocker.proceed}>Leave page</button>
        </div>
      )}
    </>
  );
}
```

For a quick `window.confirm` approach instead of a custom dialog:

```tsx
import { useBlocker } from "@canonical/router-react";
import { useEffect, useState } from "react";

function QuickEditForm() {
  const [isDirty, setIsDirty] = useState(false);
  const blocker = useBlocker(isDirty);

  useEffect(() => {
    if (blocker.state === "blocked") {
      if (window.confirm("You have unsaved changes. Leave anyway?")) {
        blocker.proceed();
      } else {
        blocker.cancel();
      }
    }
  }, [blocker]);

  return <form onChange={() => setIsDirty(true)}>...</form>;
}
```

The blocker registers on mount and disposes on unmount. Unmounting while a navigation is blocked **discards** that navigation (it is not resumed). Blockers intercept `router.navigate()` only — `setSearchParams()` and browser back/forward are not intercepted.

## Creating routes and matching URLs

### Route creation

Each entry in the route map is a named call to `route()`.

```tsx
import {
  createBrowserAdapter,
  createRouter,
  route,
} from "@canonical/router-core";

const routes = {
  home: route({
    url: "/",
    content: () => <h1>Home</h1>,
  }),
  docs: route({
    url: "/docs/:slug",
    warm: async ({ slug }) => {
      await queryClient.prefetchQuery(["doc", slug], () => fetchDoc(slug));
    },
    content: ({ params }) => <DocPage slug={params.slug} />,
  }),
  accountSettings: route({
    url: "/account/settings",
    content: () => <h1>Settings</h1>,
  }),
} as const;

const router = createRouter(routes, { adapter: createBrowserAdapter() });
```

Important parts:

- the route-map key such as `docs` is the typed navigation name used by `Link` and `router.navigate()`
- the `url` string is the matcher used for incoming URLs
- `:slug` segments become typed route params
- `warm` runs at navigation time as a fire-and-forget hook
- `content` renders the matched route, receiving `params` and `search`

Routes stay flat even when the UI is nested. Shared layout lives in wrappers from the core package, not in a nested route tree.

## SSR and hydration

There is one SSR story: the server serializes the router's dehydrated state into the page's `__INITIAL_DATA__` payload (the `INITIAL_DATA_KEY` contract shared with `@canonical/react-ssr`), and the client reads it back with `readDehydratedState()`.

### Server side

`renderToStream(router, url)` loads the URL into a server-adapter router, streams the matched React output, and hands back everything the response needs:

```tsx
import { createRouter, createServerAdapter } from "@canonical/router-core";
import { renderToStream } from "@canonical/router-react";

app.get("*", async (req, res) => {
  const router = createRouter(routes, {
    adapter: createServerAdapter(req.url),
    notFound: notFoundRoute,
  });

  const { stream, loadResult, bootstrapScriptContent } = await renderToStream(
    router,
    req.url,
  );

  res.status(loadResult.status); // 200, 404 for not-found, error statuses
  // Inject `bootstrapScriptContent` into the HTML (an inline <script> that
  // sets window.__INITIAL_DATA__), then send the stream.
});
```

When you integrate with `@canonical/react-ssr`'s `JSXRenderer` instead (as the reference app does), spread the dehydrated fields — `{ href, kind, routeId, status }` from `router.dehydrate()` — flat into the initial-data object next to your own fields, and pass the document's status through the renderer's `statusCode` option.

The router dehydrates **navigation state only**. Data dehydration is the cache library's responsibility.

### Client side

`readDehydratedState()` reads `window.__INITIAL_DATA__`, validates that it actually carries router fields, and returns `null` otherwise — so the same entry works on server-rendered pages (resume the server match, skip the duplicate initial load) and in SPA builds (normal initial load):

```tsx
import { createBrowserAdapter, createRouter } from "@canonical/router-core";
import {
  Outlet,
  readDehydratedState,
  RouterProvider,
} from "@canonical/router-react";
import { hydrateRoot } from "react-dom/client";

const router = createRouter(routes, {
  adapter: createBrowserAdapter(),
  hydratedState: readDehydratedState() ?? undefined,
});

hydrateRoot(
  document.getElementById("root")!,
  <RouterProvider router={router}>
    <Outlet />
  </RouterProvider>,
);
```

`createBrowserAdapter` uses the Navigation API when available (Baseline Newly Available since January 2026), falling back to the History API.

## Progressive disclosure

### `Link`

`Link` builds typed hrefs from route names and optional route params, search data, and hash values. A plain primary-button click is intercepted and routed through `router.navigate()`; the click falls through to native anchor behaviour when it has a modifier key, a non-primary button, `target="_blank"`, a `download` attribute, or was `preventDefault()`ed. Hovering warms the destination through `router.warm()`.

```tsx
<Link params={{ slug: "api" }} to="docs">
  API docs
</Link>
```

### `Outlet`

`Outlet` subscribes to router state, builds the matched subtree with `createElement`, and wraps it in `Suspense`.

It does **not** call `router.render()`. Core `render()` invokes the route's content and each wrapper as plain functions, which gives them no fiber of their own — every hook they declare would attach to `Outlet`'s hook list, and navigating between routes whose components declare different numbers of hooks would throw *"Rendered fewer hooks than expected"*. Constructing elements instead gives each component its own fiber, so its hooks belong to it. `render()` remains the correct shape for a non-React consumer.

```tsx
<Outlet fallback={<p>Loading route…</p>} />
```

### Hooks

- `useBlocker(isActive)` blocks navigation when `isActive` is `true`. Returns `{ state, proceed, cancel }`.
- `useNavigationState()` subscribes to the router loading state.
- `useRoute()` returns a tracked location proxy and rerenders only when an accessed location key changes — including `status`.
- `useRouter()` returns the router instance from context. Use `useRouter().setSearchParams()` for search param mutation.
- `useRouterState()` is the power-user hook for subscribing to selected slices of `router.getState()`.
- `useSearchParam()` subscribes to one query-string key.
- `useSearchParams()` subscribes either to the full query string or to a fixed set of keys.

Both `useSearchParam()`'s key and `useSearchParams()`'s key list are checked against the search-param keys declared by the registered route map's `search` schemas (falling back to any `string` when no `RouterRegister` is declared — see [Type registration](#3-navigate-with-typed-links-and-observe-router-state)).

Typical selection strategy:

- reach for `useBlocker()` when a form has unsaved state
- reach for `useNavigationState()` when you only need loading lifecycle
- reach for `useSearchParam()` for one query-string key
- reach for `useSearchParams()` for a fixed key set or the full query string
- reach for `useRoute()` for pathname, hash, status, or full URL reads
- reach for `useRouter()` for search param mutation or direct router access
- reach for `useRouterState()` when you need `match`, `navigation`, or other advanced state in one selector

## Boilerplate reference

The reference integration lives in [apps/react/boilerplate-vite](../../../apps/react/boilerplate-vite). It shows:

- domain-colocated route modules assembled into one flat map
- a shell-as-layout wrapper applied with `group()`
- SSR with real HTTP statuses and redirects (`resolveRouteDisposition` in its server entry) and hydration via `readDehydratedState()`
- a route-level `warm` hook priming the Relay store, read by the component's own query hook
- an auth middleware redirect flow
- a static redirect route answering 301

## Public API

### Components and helpers

- `Link` — render a typed anchor that navigates and warms through the router.
- `Outlet` — render the current matched subtree.
- `RouterProvider` — place a router instance into React context.
- `readDehydratedState()` — read (and validate) dehydrated router state from the page's initial-data payload.
- `renderToStream()` — load a URL into a router and stream the matched React output with dehydrated state and a bootstrap script.
- `RouterRegister` / `RegisteredRouteMap` / `RegisteredNotFound` — module-augmentation hooks for generics-free typing.
- `useBlocker()` — block navigation when the component has unsaved state.
- `useNavigationState()` — subscribe to the navigation lifecycle state.
- `useRoute()` — subscribe to a tracked location object.
- `useRouter()` — read the router instance from context.
- `useRouterState()` — subscribe to the full router state or a selected slice.
- `useSearchParam()` — subscribe to one search-param key.
- `useSearchParams()` — subscribe to all search params or a selected key set.

### Reference docs

- API reference: [docs/references/ROUTER_API.md](../../../docs/references/ROUTER_API.md)
- Migration guide: [docs/how-to-guides/MIGRATE_TO_PRAGMA_ROUTER.md](../../../docs/how-to-guides/MIGRATE_TO_PRAGMA_ROUTER.md)
- Design rationale: [packages/runtime/router/README.md](../../runtime/router/README.md#design-rationale)
