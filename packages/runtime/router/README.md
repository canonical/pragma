# @canonical/router-core

Framework-agnostic routing primitives for Canonical apps. `@canonical/router-core` gives you flat route definitions, wrapper composition, typed navigation helpers, SSR dehydration, middleware hooks, and accessibility orchestration without locking you into a specific view layer.

> **Stability: pre-1.0 / experimental.** The API is still consolidating and breaking changes may land between minor versions. Every breaking change ships with a conventional-commit subject and a CHANGELOG entry — those are the migration record. Pin a minor version if you need stability today.

## Installation

```bash
bun add @canonical/router-core
```

## Quick start

### 1. Define routes

```tsx
import { route } from "@canonical/router-core";

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

### 2. Create a router with an adapter

The adapter is the one construction axis — it decides where the location lives (browser URL, hash fragment, memory, a fixed server URL):

```ts
import { createBrowserAdapter, createRouter } from "@canonical/router-core";

const router = createRouter(routes, { adapter: createBrowserAdapter() });
```

A router created **without** an adapter is a pure matcher: `match()`, `buildPath()`, and `load()` work, while `navigate()` and `setSearchParams()` throw — there is no location for them to change.

### 3. Use typed helpers

```ts
router.buildPath("account", { params: { team: "web" } });
// "/account/web"

router.navigate("home");
await router.warm("account", { params: { team: "web" } });
```

### 4. Render through your framework binding

The core package intentionally stops at route matching, state, dehydration, and accessibility orchestration. For React rendering, pair it with `@canonical/router-react`.

## Mental model

- **Routes are flat.** Every route is declared with `route()`.
- **Wrappers are annotations.** Reuse layout with `wrapper()` and `group()`.
- **Middleware is route-to-route transformation.** Use it to add auth, i18n, metrics, or shared wrapper policy. Middleware runs once, before the router is created.
- **The adapter is the construction axis.** `createRouter(routes, { adapter })` is the only constructor; pick `createBrowserAdapter()`, `createHashAdapter()`, `createMemoryAdapter()`, `createServerAdapter()`, or bring your own `PlatformAdapter`.
- **`warm()` is fire-and-forget.** It warms caches, preloads assets, or runs side effects at navigation time. It does not provide data to `content()` — components own their data via their cache library.
- **Errors are state, not exceptions.** Every load commits a `status` onto the location (404 for no match, 400 for a rejected query string, the status of a thrown `StatusResponse`, 500 otherwise). Nothing is thrown at the view layer.
- **URL params are validated by schemas.** Give a route a `params` or `search` [Standard Schema](https://standardschema.dev) validator (Zod, Valibot, ArkType, or hand-rolled) and the validated, typed output flows to `content()`, `warm()`, and the typed navigation helpers.
- **SSR is built in.** `dehydrate()` preserves navigation state across the server/client boundary.

## Design rationale

These are deliberate positions, not gaps. If the router feels smaller than others you have used, that is the design.

### The router does not own data

`warm()` is the only data-adjacent hook and it is fire-and-forget on purpose. It never blocks rendering and never passes data to `content()`. The supported pattern is **cache population**: the hook warms the cache your components already read from — `fetchQuery` into a Relay store, `queryClient.prefetchQuery` for TanStack Query — and the component's own hook finds the data already there.

Handing loader data to components as props (the loader model other routers use) is rejected as an antipattern here:

- it couples data lifetime to route lifetime — leaving the route drops data the cache could have kept;
- it blocks navigation on the slowest fetch instead of letting the page stream in;
- on a cache-aware app it double-fetches: the loader fetches, then the component's cache hook fetches again or needs bridging glue.

One consequence to know: because the hook never blocks, a redirect or status thrown from an **async** `warm()` is applied *late* — the destination may render briefly before the redirect lands (applied with replace semantics, so Back does not return to it). That flash is the honest price of never blocking render.

### Errors are state, not exceptions

HTTP-shaped failures are facts about the location, so they live on the location: `getState().location.status`. The router owns data errors (no match → 404, rejected query → 400, thrown `StatusResponse`/`Response` → its status, anything else → 500) and commits them as state; the view layer owns render errors with its native mechanism (an error boundary, in React). Nothing the router does throws into your component tree. See the two-channel guide in [`@canonical/router-react`'s README](../../react/router/README.md#error-handling).

### Minimal API, low sugar

One orthogonal way per capability. There are no preset router factories — the adapter is the whole axis, so `createRouter(routes, { adapter })` is the entire construction story. Blocking is one method (`router.block()`) returning one handle. Convenience layers must earn their place; the surface we stabilize at 1.0 should be the smallest one that composes.

## Progressive disclosure

### Basic route

```tsx
import { route } from "@canonical/router-core";

const settingsRoute = route({
  url: "/settings",
  content: () => "Settings",
});
```

### Route with warm

`warm()` is a fire-and-forget navigation-time hook. Use it to warm a cache, preload assets, fire analytics, or run permission checks. It does not return data to the component.

```tsx
const userRoute = route({
  url: "/users/:id",
  warm: async ({ id }, _search, { signal }) => {
    await queryClient.prefetchQuery({
      queryKey: ["user", id],
      queryFn: () => fetchUser(id),
      signal,
    });
  },
  content: ({ params }) => `User: ${params.id}`,
});
```

Throwing from `warm()` is meaningful control flow: `redirect(to, status)` redirects, `throw new StatusResponse(404)` sets the location status. Both work from sync and async hooks — an async throw is applied late (after the route rendered) and only while the navigation is still current; any other async rejection is deliberately ignored, because a failed cache warm must never break navigation.

### Schema validation for URL params

Routes accept [Standard Schema](https://standardschema.dev) validators for both kinds of URL parameters. Any spec-compliant library schema (Zod ≥3.24, Valibot, ArkType) can be passed directly; raw values always arrive as strings, so use coercion.

**Path params** — the `params` field validates and coerces `:param` segments. A rejected URL is a **non-match**: matching falls through to the next route and ultimately the not-found route (404), exactly like a pattern mismatch.

```tsx
import { createBrowserAdapter, createRouter, route } from "@canonical/router-core";
import { z } from "zod";

const productRoute = route({
  url: "/products/:id",
  params: z.object({ id: z.coerce.number().int().positive() }),
  // "/products/abc" → 404; "/products/42" → params.id === 42 (a number)
  content: ({ params }) => `Product #${params.id}`,
});

const router = createRouter(
  { product: productRoute },
  { adapter: createBrowserAdapter() },
);

router.buildPath("product", { params: { id: 42 } }); // "/products/42" — fully typed
```

**Search params** — the `search` field validates the query string. A rejected query throws `StatusResponse(400, { issues, message })`, which `load()` commits as a 400 **error result on the location** — a real 400 under SSR, `location.status === 400` on the client. It does not reach an error boundary. Prefer normalizing schemas that supply defaults over rejecting ones — a shared URL with a stale query should not error the page:

```tsx
const listRoute = route({
  url: "/products",
  search: z.object({
    page: z.coerce.number().int().min(1).catch(1),
    sort: z.enum(["price", "name"]).catch("name"),
  }),
  content: ({ search }) => `page ${search.page}, sorted by ${search.sort}`,
});
```

No dependency? Hand-roll the Standard Schema v1 shape (`{ "~standard": { version: 1, vendor, validate } }`, annotated with `StandardSchemaV1<In, Out>` for inference). See the [Router API reference](../../../docs/references/ROUTER_API.md#schema-validation).

Validation runs at match time and is **synchronous** — async validators (e.g. Zod async refinements) throw with an explanatory error. For semantic checks (does the record exist?) use `warm` + `StatusResponse`.

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

### Error signalling

Use `StatusResponse` to give a failure an HTTP status. Thrown from `warm()`, it becomes the location's status — read it as state (`getState().location.status`, or `useRoute().status` in React), never from an error boundary:

```tsx
import { route, StatusResponse } from "@canonical/router-core";

const adminRoute = route({
  url: "/admin",
  warm: () => {
    if (!isAuthenticated()) {
      throw new StatusResponse(401);
    }
  },
  content: () => "Admin panel",
});
```

The `data` argument is optional; pass one to carry a typed payload (`new StatusResponse(503, { retryAfter: "5m" })`).

### Redirects

Runtime redirects — thrown from `warm()`, sync or async:

```ts
import { redirect, route } from "@canonical/router-core";

const privateRoute = route({
  url: "/private",
  warm: () => {
    if (!isAuthenticated()) {
      redirect("/login", 302);
    }
  },
  content: () => "private",
});
```

Static redirect routes — declared entirely in the route map, no content; they answer with 301 or 308 (the permanent family; `redirect()` covers the temporary one):

```ts
const legacyHome = route({
  url: "/home",
  redirect: "/",
  status: 301,
});
```

## Search param mutation

`setSearchParams()` patches the current URL's search params without requiring the route name (adapter required — it changes the location):

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

`router.block(isActive)` registers a blocker and returns a handle. While `isActive()` returns true, `navigate()` is intercepted and held until the handle decides it:

```ts
const blocker = router.block(() => formHasUnsavedChanges);

// When a navigation is attempted while the blocker is active:
blocker.state; // "blocked"

blocker.subscribe((state) => {
  // "blocked" → show your confirmation UI; "idle" → hide it
});

blocker.proceed(); // continue the blocked navigation
blocker.cancel(); // stay on the current page

// Remove the blocker; a navigation blocked on it is discarded, not resumed
blocker.dispose();
```

Blockers intercept `router.navigate()` only — `setSearchParams()` and adapter-driven back/forward are not intercepted. For React, use `useBlocker()` from `@canonical/router-react`.

## Middleware

Middleware is a route-to-route transformation (`<TRoute extends AnyRoute>(route: TRoute) => TRoute`), applied once before the router exists. Pass it through `RouterOptions.middleware` — the first entry in the array is the outermost transformation (applied last):

```ts
import {
  type AnyRoute,
  createBrowserAdapter,
  createRouter,
  route,
} from "@canonical/router-core";

function withBasePath(basePath: string) {
  return <TRoute extends AnyRoute>(currentRoute: TRoute): TRoute => {
    return {
      ...currentRoute,
      url: `${basePath}${currentRoute.url}`,
    } as TRoute;
  };
}

const routes = {
  home: route({ url: "/", content: () => "Home" }),
} as const;

const router = createRouter(routes, {
  adapter: createBrowserAdapter(),
  middleware: [withBasePath("/app")],
});
```

The standalone `applyMiddleware(routes, middleware)` export is the lower-level array primitive (`readonly AnyRoute[]` in, same out) the option is built on; reach for it only when transforming route arrays outside a router.

See the [middleware cookbook](../../../docs/how-to-guides/ROUTER_MIDDLEWARE_COOKBOOK.md) for auth, i18n, and instrumentation patterns.

## Platform adapters

The adapter decides where the location lives; everything else about the router is identical across them:

- `createBrowserAdapter()` — auto-detects the best API: uses the Navigation API (`window.navigation`) when available, falls back to the History API (`pushState` / `popstate`) for older browsers.
- `createNavigationAdapter()` — explicitly use the Navigation API. Baseline Newly Available since January 2026.
- `createHistoryAdapter()` — explicitly use the History API.
- `createHashAdapter()` — store the route in `window.location.hash`; useful where the path is fixed (Storybook, static file hosts).
- `createMemoryAdapter(initialUrl?, options?)` — in-memory adapter for testing.
- `createServerAdapter(url)` — a fixed URL for server-side rendering; its `navigate()` throws.

```ts
import { createMemoryAdapter, createRouter } from "@canonical/router-core";

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

## SSR and hydration

On the server, create the router with a server adapter, match the URL for the response status, and hydrate the store synchronously so rendering works without awaiting `load()`:

```ts
import { createRouter, createServerAdapter } from "@canonical/router-core";

const router = createRouter(routes, {
  adapter: createServerAdapter(url),
  notFound: notFoundRoute,
});
const serverMatch = router.match(url);

if (serverMatch?.kind === "redirect") {
  // Answer with a real HTTP redirect before rendering anything.
  return respondRedirect(serverMatch.status, serverMatch.redirectTo);
}

if (serverMatch?.kind === "route" || serverMatch?.kind === "not-found") {
  router.hydrate({
    href: url,
    kind: serverMatch.kind,
    routeId: serverMatch.kind === "route" ? serverMatch.name : null,
    status: serverMatch.status, // 200, or 404 for the matched not-found route
  });
}
```

The router dehydrates navigation state only (`router.dehydrate()` → `{ href, kind, routeId, status }`). Data dehydration is the cache library's responsibility. On the client, pass the serialized state back as `hydratedState`:

```ts
import { createBrowserAdapter, createRouter } from "@canonical/router-core";

const clientRouter = createRouter(routes, {
  adapter: createBrowserAdapter(),
  hydratedState: serializedState ?? undefined,
});
```

For the full React flow — `renderToStream`, `readDehydratedState`, and the `__INITIAL_DATA__` contract — see [packages/react/router/README.md](../../react/router/README.md) and the reference app in [apps/react/boilerplate-vite](../../../apps/react/boilerplate-vite).

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
- `createHashAdapter()`
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

All supporting types (`Router`, `RouterOptions`, `RouterBlockerHandle`, `PlatformAdapter`, `MemoryAdapterOptions`, `StandardSchemaV1`, …) are exported from the package root.

### Reference docs

- API reference: [docs/references/ROUTER_API.md](../../../docs/references/ROUTER_API.md)
- Migration guide: [docs/how-to-guides/MIGRATE_TO_PRAGMA_ROUTER.md](../../../docs/how-to-guides/MIGRATE_TO_PRAGMA_ROUTER.md)
- Middleware cookbook: [docs/how-to-guides/ROUTER_MIDDLEWARE_COOKBOOK.md](../../../docs/how-to-guides/ROUTER_MIDDLEWARE_COOKBOOK.md)
