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
    component: () => "Home",
  }),
  account: route({
    url: "/account/:team",
    component: ({ params }) => `Account: ${params.team}`,
  }),
} as const;
```

A data route declares its UI through exactly one of two fields. `component` (shown above) is preferred: a component receiving `{ params, search }` props, rendered with its own fiber by framework adapters such as `@canonical/router-react`, so hooks are legal inside it. The deprecated `content` render-function form accepts the same shape and keeps working:

```tsx
// Deprecated — prefer `component` (AV-340). Kept here as the migration reference.
const legacyRoute = route({
  url: "/legacy",
  content: () => "Legacy",
});
```

`route()` throws when both or neither of `component`/`content` are declared.

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
- **`prefetch()` is fire-and-forget.** It warms caches, preloads assets, or runs side effects at navigation time. It does not provide data to the route component — components own their data via their cache library.
- **URL params are validated by schemas.** Give a route a `params` or `search` [Standard Schema](https://standardschema.dev) validator (Zod, Valibot, ArkType, or hand-rolled) and the validated, typed output flows to the route `component`, `prefetch()`, and the typed navigation helpers.
- **SSR is built in.** `dehydrate()` preserves navigation state across the server/client boundary.

## Progressive disclosure

### Basic route

```tsx
import { route } from "@canonical/router-core";

const settingsRoute = route({
  url: "/settings",
  component: () => "Settings",
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
  component: ({ params }) => `User: ${params.id}`,
});
```

### Schema validation for URL params

Routes accept [Standard Schema](https://standardschema.dev) validators for both kinds of URL parameters. Any spec-compliant library schema (Zod ≥3.24, Valibot, ArkType) can be passed directly; raw values always arrive as strings, so use coercion.

**Path params** — the `params` field validates and coerces `:param` segments. A rejected URL is a **non-match**: matching falls through to the next route and ultimately the not-found route (404), exactly like a pattern mismatch.

```tsx
import { route } from "@canonical/router-core";
import { z } from "zod";

const productRoute = route({
  url: "/products/:id",
  params: z.object({ id: z.coerce.number().int().positive() }),
  // "/products/abc" → 404; "/products/42" → params.id === 42 (a number)
  component: ({ params }) => `Product #${params.id}`,
});

router.buildPath("product", { params: { id: 42 } }); // "/products/42" — fully typed
```

**Search params** — the `search` field validates the query string. A rejected query throws `StatusResponse(400, { issues, message })`: `load()` commits it as a 400 error result (a real 400 under SSR, an error-boundary render on the client). Prefer normalizing schemas that supply defaults over rejecting ones — a shared URL with a stale query should not crash the page:

```tsx
const listRoute = route({
  url: "/products",
  search: z.object({
    page: z.coerce.number().int().min(1).catch(1),
    sort: z.enum(["price", "name"]).catch("name"),
  }),
  component: ({ search }) => `page ${search.page}, sorted by ${search.sort}`,
});
```

No dependency? Hand-roll the schema — either the Standard Schema v1 shape (`{ "~standard": { version: 1, vendor, validate } }`, annotate with `StandardSchemaV1<In, Out>` for inference) or the legacy type-only shape (`{ "~standard": { output, validate } }`). See the [Router API reference](../../../docs/references/ROUTER_API.md#schema-validation) for both.

Validation runs at match time and is **synchronous** — async validators (e.g. Zod async refinements) throw with an explanatory error. For semantic checks (does the record exist?) use `prefetch` + `StatusResponse`.

### Wrapper composition

```tsx
import { group, route, wrapper } from "@canonical/router-core";

const appShell = wrapper({
  id: "app:shell",
  component: ({ children }) => `<main>${String(children)}</main>`,
});

const [dashboardRoute, reportsRoute] = group(appShell, [
  route({ url: "/dashboard", component: () => "Dashboard" }),
  route({ url: "/reports", component: () => "Reports" }),
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
  component: () => "Admin panel",
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
  component: () => "private",
});
```

## Search param mutation

`setSearchParams()` patches the current URL's search params without requiring the route name:

```ts
// Merge into current search params
router.setSearchParams({ page: "2" });

// Functional update
router.setSearchParams((current) => ({
  ...current,
  page: String(Number(current.page ?? "0") + 1),
}));

// Remove a param (set to null)
router.setSearchParams({ filter: null });

// Replace history entry instead of pushing
router.setSearchParams({ page: "2" }, { replace: true });
```

## Navigation blocking

Register blockers to prevent navigation when there is unsaved state. Blockers are checked before any navigation proceeds:

```ts
const blockerId = "edit-form";

// Register a blocker that checks whether to block
router.registerBlocker({
  id: blockerId,
  isActive: () => formHasUnsavedChanges,
});

// When navigation is attempted while a blocker is active:
router.blockerState; // "blocked"

// The consumer decides whether to proceed or cancel
router.proceedNavigation(); // continue the blocked navigation
router.cancelNavigation();  // stay on the current page

// Remove the blocker when the form is submitted or discarded
router.unregisterBlocker(blockerId);
```

For React, use the `useBlocker()` hook from `@canonical/router-react` instead of these core primitives.

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

See the [migration guide](../../../docs/how-to-guides/MIGRATE_TO_PRAGMA_ROUTER.md) for middleware patterns and migration from other routers.

## Router factories

Convenience functions that create a router with a pre-configured platform adapter:

```ts
import {
  createBrowserRouter,
  createStaticRouter,
  createMemoryRouter,
} from "@canonical/router-core";

// Client — auto-detects Navigation API with History fallback
const router = createBrowserRouter(routes);

// Server — matches URL on construction, exposes router.match for status codes
const serverRouter = createStaticRouter(routes, req.url);

if (!serverRouter.match) { res.status(404); }
else if (serverRouter.match.kind === "redirect") {
  return res.redirect(serverRouter.match.status, serverRouter.match.redirectTo);
}

// Testing — in-memory adapter, supports navigation
const testRouter = createMemoryRouter(routes, "/users/42");
```

`createStaticRouter` fires `prefetch()` eagerly on construction, so caches start warming before React renders.

The low-level `createRouter(routes, { adapter })` is still available for cases that need explicit adapter control.

## SSR and hydration

The router dehydrates navigation state only (matched route, params, search, URL). Data dehydration is the cache library's responsibility.

```ts
const serverRouter = createStaticRouter(routes, "/users/42");
const navigationState = serverRouter.dehydrate();

const clientRouter = createBrowserRouter(routes, {
  hydratedState: navigationState ?? undefined,
});
```

For a full React SSR flow, see [packages/react/router/README.md](../../react/router/README.md) and [apps/react/boilerplate-vite](../../../apps/react/boilerplate-vite).

## Platform adapters

The router factories use platform adapters internally. You can also use them directly with `createRouter()`:

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

### Externally owned location

By default `createMemoryAdapter()` owns its location: it keeps an internal entries array and index that `navigate`, `back`, and `forward` mutate. Some hosts already own navigation state and need the router as a pure resolver rather than a second state owner — an application store that decides what is shown, a replay harness driving location from a recorded sequence, a state machine where "where we are" is derived state. For those, pass a `history` delegate and the adapter keeps no entries array and no index of its own:

```ts
const adapter = createMemoryAdapter("/", {
  history: {
    getLocation: () => store.currentUrl, // the single source of the current location
    onNavigate: (url, options) => store.go(url, options), // every navigate forwards here
    subscribe: (listener) => store.subscribe(listener), // host announces location changes
    onBack: () => store.back(), // optional — omit and back() becomes a no-op
    onForward: () => store.forward(), // optional — omit and forward() becomes a no-op
  },
});
```

With a delegate, `getLocation` reads the delegate, `navigate(to, options)` forwards to `onNavigate` and mutates nothing locally, and the adapter's `subscribe` is the seam through which the host announces changes. `back` and `forward` forward to the optional `onBack`/`onForward` hooks; when the host omits them they are no-ops, because a host that owns location owns its own history model. The `initialUrl` argument is ignored when a delegate is present. The entire route-resolution surface — matching, params, group wrappers — is unchanged.

Host values are normalized at the boundary: `getLocation` reads and subscription notifications both hand consumers a fresh `URL`, so a host mutating its own URL object cannot reach router internals, and a delegate may return bare path strings. An error thrown by `onNavigate` propagates to the `navigate` caller.

**The host must notify synchronously.** When the router navigates, it suppresses the echo of its own navigation through a guard that only holds for a notification fired synchronously within `onNavigate`. A host that batches change notifications (microtask, animation frame, or later) will miss the guard and every router-initiated navigation will resolve twice. If your store batches, notify the adapter's listener directly and synchronously inside `onNavigate`.

`createMemoryRouter(routes, initialUrl, { history })` forwards the delegate to its internal adapter, so the convenience factory supports externally owned location too.

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
- `createBrowserRouter()`
- `createHistoryAdapter()`
- `createMemoryAdapter()`
- `createMemoryRouter()`
- `createNavigationAdapter()`
- `createRouter()`
- `createRouterStore()`
- `createServerAdapter()`
- `createStaticRouter()`
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

- Migration guide: [docs/how-to-guides/MIGRATE_TO_PRAGMA_ROUTER.md](../../../docs/how-to-guides/MIGRATE_TO_PRAGMA_ROUTER.md)
