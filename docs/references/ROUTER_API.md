# Router API reference

This document is the real API reference for `@canonical/router-core` and `@canonical/router-react`.

Use it when you already understand the mental model and want to answer one of these questions quickly:

- Which function should I call?
- What does a router instance expose?
- Which type should I reach for in app code?
- How does the React package layer on top of the core package?

For tutorial-style guidance, start with:

- [packages/runtime/router/README.md](../../packages/runtime/router/README.md)
- [packages/react/router/README.md](../../packages/react/router/README.md)
- [docs/how-to-guides/MIGRATE_FROM_TANSTACK_ROUTER.md](../how-to-guides/MIGRATE_FROM_TANSTACK_ROUTER.md)
- [docs/how-to-guides/ROUTER_MIDDLEWARE_COOKBOOK.md](../how-to-guides/ROUTER_MIDDLEWARE_COOKBOOK.md)

## `@canonical/router-core`

`@canonical/router-core` owns route definitions, matching, loading, navigation intents, router state, dehydration, and optional accessibility orchestration.

### Route construction

#### `route(definition)`

Creates a typed route definition and attaches a path codec.

Supports two shapes:

```ts
route({
   url: "/users/:id",
   content,
   fetch,
   search,
   error,
   wrappers,
});

route({
   url: "/old-path",
   redirect: "/new-path",
   status: 301,
   wrappers,
});
```

Behavior:

- adds a `parse(url)` function that returns typed params or `null`
- adds a `render(params)` function that builds the concrete pathname
- normalizes `wrappers` to an array
- preserves either the data-route or redirect-route shape

Use `route()` for every route. It is the only route constructor.

##### Exact route authoring shapes

`route()` and `wrapper()` are driven by these contracts.

```ts
interface NavigationContext {
   readonly signal: AbortSignal;
}

interface RouteContentProps<TParams, TSearch, TData> {
   readonly params: TParams;
   readonly search: TSearch;
   readonly data: TData;
}

interface RouteErrorProps<TPath extends string, TSearch> {
   readonly error: unknown;
   readonly status: number;
   readonly params: RouteParams<TPath>;
   readonly search: TSearch;
   readonly url: string;
}

interface DataRouteInput<TPath extends string, TSearchSchema, TData, TRendered> {
   readonly url: TPath;
   readonly content: (props: RouteContentProps<...>) => TRendered;
   readonly fetch?: (
      params: RouteParams<TPath>,
      search: InferSearch<TSearchSchema>,
      context: NavigationContext,
   ) => Promise<TData>;
   readonly search?: TSearchSchema;
   readonly error?: (props: RouteErrorProps<TPath, InferSearch<TSearchSchema>>) => TRendered;
   readonly wrappers?: readonly AnyWrapper[];
}

interface RedirectRouteInput<TPath extends string> {
   readonly url: TPath;
   readonly redirect: string;
   readonly status: 301 | 308;
   readonly wrappers?: readonly AnyWrapper[];
}
```

Practical reading:

- `content` always receives `params`, `search`, and `data`
- `fetch` always receives `params`, `search`, and an abort `signal`
- route `error` receives the thrown error, resolved status, params, search, and failing URL
- static redirect routes are declaration-time redirects; dynamic redirects belong in `fetch()` via `redirect()`

#### `wrapper(definition)`

Creates a nominal wrapper definition.

```ts
const shell = wrapper({
   id: "app:shell",
   component: ({ children }) => children,
   fetch,
   error,
});
```

Wrappers are reusable layout and boundary units. A wrapper can:

- render shared UI around matched content
- fetch shared data before route rendering
- provide a shared error fallback

Exact shape:

```ts
interface WrapperComponentProps<TData, TRendered> {
   readonly data: TData;
   readonly children: TRendered;
}

interface WrapperErrorProps<TParams, TSearch> {
   readonly error: unknown;
   readonly status: number;
   readonly params: TParams;
   readonly search: TSearch;
   readonly url: string;
}

interface WrapperDefinition<TData, TRendered> {
   readonly id: string;
   readonly component: (props: WrapperComponentProps<TData, TRendered>) => TRendered;
   readonly fetch?: (
      params: RouteParamValues,
      context: NavigationContext,
   ) => Promise<TData>;
   readonly error?: (props: WrapperErrorProps<RouteParamValues, unknown>) => TRendered;
}
```

Important difference from route loaders:

- wrapper `fetch` receives `params` and `context`
- route `fetch` receives `params`, `search`, and `context`
- wrapper data is stored by wrapper id in `wrapperData`

#### `group(wrapper, routes)`

Prepends one wrapper to every route in a flat route list.

```ts
const [dashboard, reports] = group(shell, [
   route({ url: "/dashboard", content: Dashboard }),
   route({ url: "/reports", content: Reports }),
] as const);
```

Use `group()` when several flat routes should share the same wrapper stack.

#### `applyMiddleware(routes, middleware)`

Applies route endomorphisms to a route list.

```ts
const nextRoutes = applyMiddleware(routes, [withI18n(), withAuth()]);
```

Behavior:

- middleware runs outermost-first in array order
- each middleware receives one route and returns one route
- useful for auth, i18n, timing, or generated route transforms

### Redirects and errors

#### `redirect(to, status?)`

Throws a redirect value during route or wrapper loading.

```ts
redirect("/login", 302);
```

Accepted statuses: `301 | 302 | 307 | 308`.

Use this inside `fetch()` when the redirect depends on runtime state.

#### `Redirect`

The redirect error class thrown by `redirect()`.

You normally do not instantiate this directly in app code.

#### `StatusResponse`

Error helper with an HTTP-like status code.

Use it when a route or wrapper should fail with a structured status that can be rendered by route- or wrapper-level error boundaries.

### Router creation and adapters

#### `createRouter(routes, options?)`

Creates the router instance.

```ts
const router = createRouter(routes, {
   adapter,
   middleware,
   notFound,
   hydratedState,
   initialUrl,
   accessibility,
});
```

Key behavior:

- applies route middleware before setup
- sorts routes by matching priority
- wires an adapter when provided
- auto-initializes browser accessibility helpers when browser globals exist
- can hydrate previously loaded server state
- returns a typed `Router<TRoutes, TNotFound>`

Exact option shape:

```ts
interface RouterOptions<TNotFound extends AnyRoute | undefined = undefined> {
   readonly adapter?: PlatformAdapter;
   readonly accessibility?: RouterAccessibilityOptions;
   readonly hydratedState?: RouterDehydratedState<RouteMap>;
   readonly initialUrl?: string | URL;
   readonly middleware?: readonly RouteMiddleware[];
   readonly notFound?: TNotFound;
}
```

Typical use:

- browser app: provide `adapter`, or use `createHydratedRouter()` in React
- tests: provide `createMemoryAdapter()`
- SSR hydrate: provide `hydratedState`
- app-wide transforms: provide `middleware`
- custom 404 screen: provide `notFound`

#### `createBrowserAdapter(windowLike?)`

Creates a `PlatformAdapter` backed by `window.history` and `popstate`.

Use this in browser-only or framework-integrated setups. `@canonical/router-react` does this for you in `createHydratedRouter()`.

Adapter contract:

```ts
interface PlatformAdapter {
   getLocation(): string | URL;
   navigate(url: string, options?: { replace?: boolean; state?: unknown }): void;
   subscribe(callback: (location: string | URL) => void): () => void;
}
```

#### `createMemoryAdapter(initialUrl?)`

Creates an in-memory history adapter.

Useful for:

- tests
- demos
- non-browser environments
- deterministic navigation assertions

The returned adapter also exposes `back()` and `forward()`.

```ts
interface MemoryAdapter extends PlatformAdapter {
   back(): void;
   forward(): void;
}
```

#### `createServerAdapter(initialUrl)`

Creates a static adapter for one server request URL.

Use it when you want router matching and loading against an explicit server request location, without client-side navigation.

#### `createRouterStore(routes, notFound?)`

Low-level state store used by the router implementation.

Most app code should not call this directly. Reach for it only when you are extending router internals or building alternate bindings.

#### `createSubject()`

Minimal observable primitive used by store internals.

#### `createTrackedLocation()`

Utility for tracking which location properties a consumer accessed. This supports fine-grained subscriptions in bindings.

### The `Router` instance

`createRouter()` returns a `Router<TRoutes, TNotFound>` with these high-value members.

#### Properties

| Member | Meaning |
|---|---|
| `routes` | The resolved typed route map. |
| `notFound` | Optional not-found route definition. |
| `adapter` | Active platform adapter or `null`. |
| `store` | The underlying `RouterStore`. |

The router instance is the runtime boundary between route definitions and UI bindings.

- core code can call it directly
- React bindings subscribe to it
- SSR uses `load()`, `dehydrate()`, and `render()`

#### Lookup and state

| Member | Meaning |
|---|---|
| `getRoute(name)` | Returns one route definition by name. |
| `getState()` | Returns the current router state. |
| `getTrackedLocation(onAccess)` | Returns a tracked location proxy for fine-grained subscriptions. |
| `match(url)` | Returns the current route match without loading data. |

#### Navigation and loading

| Member | Meaning |
|---|---|
| `buildPath(name, options?)` | Builds a concrete href from route name, params, search, and hash. |
| `navigate(name, options?)` | Builds a typed navigation intent and performs adapter navigation when available. |
| `prefetch(name, options?)` | Preloads the route module and data. |
| `load(url)` | Matches and resolves route data plus wrapper data for a URL. |
| `render(result?)` | Renders the currently loaded match tree. |

#### SSR and lifecycle

| Member | Meaning |
|---|---|
| `dehydrate()` | Serializes the currently loaded result, or returns `null`. |
| `hydrate(state)` | Restores a previous load result into the router. |
| `dispose()` | Tears down subscriptions and router-owned resources. |

#### Subscriptions

| Member | Meaning |
|---|---|
| `subscribe(listener)` | Subscribe to any router snapshot change. |
| `subscribeToNavigation(listener)` | Subscribe only to navigation state changes. |
| `subscribeToSearchParam(key, listener)` | Subscribe only to one query-string key. |

#### Exact runtime state shapes

```ts
type RouterNavigationState = "idle" | "loading";

interface RouterLocationState {
   readonly hash: string;
   readonly href: string;
   readonly pathname: string;
   readonly searchParams: URLSearchParams;
   readonly status: number;
   readonly url: URL;
}

interface RouterState<TRoutes, TNotFound> {
   readonly location: RouterLocationState;
   readonly match: RouterMatch<TRoutes, TNotFound> | null;
   readonly navigation: {
      readonly state: RouterNavigationState;
   };
}

interface RouterSnapshot<TRoutes, TNotFound> extends RouterLocationState {
   readonly match: RouterMatch<TRoutes, TNotFound> | null;
   readonly navigationState: RouterNavigationState;
}
```

Practical reading:

- `getState()` returns nested state under `location` and `navigation`
- `subscribe()` listeners observe a flattened `RouterSnapshot`
- `status` lives on location state and mirrors the last resolved load status

### Route and wrapper shapes

#### `DataRouteInput`

Input shape for a normal route.

Important fields:

| Field | Meaning |
|---|---|
| `url` | Route pattern such as `"/users/:id"`. |
| `content` | Render function for the route. |
| `fetch` | Optional loader. Receives `params`, typed `search`, and `NavigationContext`. |
| `search` | Optional schema used to infer typed query params. |
| `error` | Optional route-level error renderer. |
| `wrappers` | Optional wrapper stack. |

#### `RedirectRouteInput`

Input shape for a static redirect route.

Important fields:

| Field | Meaning |
|---|---|
| `url` | Source pattern. |
| `redirect` | Target location. |
| `status` | `301` or `308`. |
| `wrappers` | Optional wrapper stack. |

#### `WrapperDefinition`

Reusable wrapper contract.

Important fields:

| Field | Meaning |
|---|---|
| `id` | Stable wrapper identifier. Must be unique across the route set. |
| `component` | Wrapper renderer around child content. |
| `fetch` | Optional shared loader. |
| `error` | Optional shared error renderer. |

### Matching and load results

#### `RouterMatch`

Union of:

- `DataRouteMatch`
- `RedirectRouteMatch`
- `NotFoundRouteMatch`

Every match includes:

- `route`
- `params`
- `search`
- `pathname`
- `url`

Variant-specific fields:

```ts
interface DataRouteMatch<TName, TRoute> {
   readonly kind: "route";
   readonly name: TName;
   readonly status: 200;
}

interface RedirectRouteMatch<TName, TRoute> {
   readonly kind: "redirect";
   readonly name: TName;
   readonly redirectTo: string;
   readonly status: TRoute["status"];
}

interface NotFoundRouteMatch<TRoute> {
   readonly kind: "not-found";
   readonly name: null;
   readonly status: 404;
}
```

#### `RouterLoadResult`

Result returned by `load()` and `hydrate()`.

Important fields:

| Field | Meaning |
|---|---|
| `match` | The resolved match or `null`. |
| `status` | Final HTTP-like status. |
| `routeData` | Resolved route loader data. |
| `wrapperData` | Resolved wrapper loader data keyed by wrapper id. |
| `error` | Caught error, if any. |
| `errorBoundary` | Indicates whether a route or wrapper boundary handled the failure. |
| `location` | Final resolved location state. |
| `dehydrate()` | Serializes the load result for SSR hydration. |

Exact shape:

```ts
interface RouterLoadResult<TRoutes, TNotFound> {
   dehydrate(): RouterDehydratedState<TRoutes>;
   readonly error: unknown;
   readonly errorBoundary: {
      readonly type: "route" | "wrapper";
      readonly wrapperId: string | null;
   } | null;
   readonly location: RouterLocationState;
   readonly match: RouterMatch<TRoutes, TNotFound> | null;
   readonly routeData: unknown;
   readonly status: number;
   readonly wrapperData: Readonly<Record<string, unknown>>;
}
```

Interpretation:

- `errorBoundary.type === "route"` means the route-level error renderer handled the failure
- `errorBoundary.type === "wrapper"` means one wrapper error renderer handled it
- `wrapperId` identifies which wrapper boundary handled the error

#### `RouterDehydratedState`

Serialized SSR payload.

Important fields:

| Field | Meaning |
|---|---|
| `href` | Original loaded href. |
| `kind` | `"route" | "not-found" | "unmatched"`. |
| `routeId` | Matched route name or `null`. |
| `routeData` | Serialized route data. |
| `wrapperData` | Serialized wrapper data. |
| `status` | Final status code. |

### Configuration types

#### `RouterOptions`

Primary router configuration object.

| Field | Meaning |
|---|---|
| `adapter` | Platform adapter implementation. |
| `accessibility` | Accessibility integrations and overrides. |
| `hydratedState` | Previous server load state to hydrate. |
| `initialUrl` | Explicit initial URL for routers without an adapter. |
| `middleware` | Route middleware array. |
| `notFound` | Optional not-found route. |

#### `RouterAccessibilityOptions`

Overrides for browser navigation affordances.

| Field | Meaning |
|---|---|
| `document` | Document-like object used by accessibility helpers. |
| `focusManager` | Custom focus manager or `false` to disable. |
| `getTitle` | Title resolver for route announcements. |
| `routeAnnouncer` | Custom announcer or `false` to disable. |
| `scrollManager` | Custom scroll manager or `false` to disable. |
| `viewTransition` | Custom transition manager or `false` to disable. |

### Type index by intent

Use these types when building app code or helpers.

#### Route authoring

| Type | When to use it |
|---|---|
| `RouteInput` | Accept either a data route or redirect route. |
| `DataRouteInput` | Constrain an API to normal content routes. |
| `RedirectRouteInput` | Constrain an API to static redirects. |
| `RouteDefinition` | Accept a normalized route returned by `route()`. |
| `WrapperInput` / `WrapperDefinition` | Accept or return wrappers. |
| `RouteContentProps` | Type route render props. |
| `RouteErrorProps` | Type route error render props. |
| `WrapperComponentProps` | Type wrapper render props. |
| `WrapperErrorProps` | Type wrapper error props. |

#### Type extraction helpers

| Type | Meaning |
|---|---|
| `RouteMap` | A flat record of route names to routes. |
| `RouteName<TRoutes>` | String union of route names. |
| `RouteOf<TRoutes, TName>` | Route type for one route name. |
| `ParamsOf<TRoute>` | Param object for one route. |
| `SearchOf<TRoute>` | Search type inferred from the route schema. |
| `DataOf<TRoute>` | Loader data type for one route. |
| `PathBuildOptions<TRoute>` | Options accepted by `buildPath()`. |
| `NavigationIntent<TName, TRoute>` | Typed result of `navigate()`. |

#### Middleware and grouping helpers

| Type | Meaning |
|---|---|
| `RouteMiddleware` | One route-to-route transform. |
| `GroupedRoutes<TWrapper, TRoutes>` | Output of `group()`. |
| `PrependWrapper<TWrapper, TRoute>` | Result type when a wrapper is prepended. |

#### Matching and store internals

| Type | Meaning |
|---|---|
| `RouterState` | Full router state tree. |
| `RouterSnapshot` | Snapshot returned to subscribers. |
| `RouterStore` | Store contract used by the router and bindings. |
| `TrackedLocation` | Proxy-backed location used for selective subscriptions. |
| `PlatformAdapter` | Adapter contract for browser, memory, and server runtimes. |
| `MemoryAdapter` | Platform adapter with `back()` and `forward()`. |

#### Accessibility

| Type | Meaning |
|---|---|
| `RouterAccessibilityContext` | Input passed to `getTitle`. |
| `FocusManagerLike` | Focus handoff contract. |
| `RouteAnnouncerLike` | Screen-reader announcement contract. |
| `ScrollManagerLike` | Scroll restoration contract. |
| `ViewTransitionManagerLike` | View transition orchestration contract. |
| `RouterAccessibilityDocumentLike` | Minimal document shape for accessibility helpers. |

#### Utility and schema types

| Type | Meaning |
|---|---|
| `StandardSchemaLike` | Minimal standard-schema contract for typed search params. |
| `InferSearch<TSchema>` | Search output inferred from a search schema. |
| `ParamNames<TPath>` / `RouteParams<TPath>` | Param extraction from path strings. |
| `BivariantCallback` | Internal helper for callback variance. |
| `UnionToIntersection` | Internal helper used to build typed overload-like helpers. |
| `StripParamModifier` | Internal helper for path param parsing. |
| `HasParams<TRoute>` | Whether a route requires params. |
| `BuildPathFn` / `NavigateFn` / `PrefetchFn` | Typed function shapes used on `Router`. |

### What is actually exported from `@canonical/router-core`

Runtime exports:

- `applyMiddleware`
- `createBrowserAdapter`
- `createMemoryAdapter`
- `createRouter`
- `createRouterStore`
- `createServerAdapter`
- `createSubject`
- `createTrackedLocation`
- `group`
- `Redirect`
- `redirect`
- `route`
- `StatusResponse`
- `wrapper`

In addition, all public types are re-exported from `types.ts`.

## `@canonical/router-react`

`@canonical/router-react` supplies React context, subscriptions, links, outlets, and SSR helpers on top of the core router.

### Components and helpers

#### `RouterProvider`

Places a router into React context.

```tsx
<RouterProvider router={router}>{children}</RouterProvider>
```

Props are defined by `RouterProviderProps`:

| Prop | Meaning |
|---|---|
| `router` | The typed router instance. |
| `children` | Descendant React tree. |

Exact shape:

```ts
interface RouterProviderProps<TRoutes, TNotFound> {
   readonly children?: ReactNode;
   readonly router: Router<TRoutes, TNotFound>;
}
```

#### `Outlet`

Subscribes to the router and renders the active route tree through Suspense.

```tsx
<Outlet fallback={<p>Loading…</p>} />
```

Props are defined by `OutletProps`:

| Prop | Meaning |
|---|---|
| `fallback` | Optional Suspense fallback while content resolves. |

Exact shape:

```ts
interface OutletProps {
   readonly fallback?: ReactNode;
}
```

Runtime context:

- `Outlet` subscribes with `useSyncExternalStore()`
- it calls `router.render()` to obtain the active rendered tree
- it wraps that tree in `Suspense`

#### `ServerRouter`

Convenience component that combines `RouterProvider` and `Outlet` for server rendering.

```tsx
<ServerRouter router={router} fallback={<p>Loading…</p>} />
```

Exact shape:

```ts
interface ServerRouterProps<TRoutes, TNotFound> extends OutletProps {
   readonly router: Router<TRoutes, TNotFound>;
}
```

Runtime context:

- `ServerRouter` is thin convenience only
- it renders `RouterProvider` and then `Outlet`
- it does not load data itself; load before rendering, or use `renderToStream()`

#### `Link`

Typed anchor component.

Behavior:

- computes `href` from route name plus params/search/hash
- intercepts ordinary left-click navigation
- preserves modifier-key and `_blank` behavior
- triggers `prefetch()` on mouse enter

Core props:

| Prop | Meaning |
|---|---|
| `to` | Route name. |
| `params` | Route params when required. |
| `search` | Query object for the target route. |
| `hash` | Optional fragment. |
| `children` | Anchor contents. |
| native anchor props | Passed through except `href`, which is computed. |

Typed prop shapes are exposed as `LinkBuildOptions` and `LinkProps`.

Exact shapes:

```ts
type LinkBuildOptions<TRoute extends AnyRoute> = {
   readonly hash?: string;
   readonly search?: SearchOf<TRoute>;
} & (HasParams<TRoute> extends true
   ? { readonly params: ParamsOf<TRoute> }
   : { readonly params?: ParamsOf<TRoute> });

type LinkProps<TRoutes, TName> = Omit<
   AnchorHTMLAttributes<HTMLAnchorElement>,
   "href"
> &
   LinkBuildOptions<RouteOf<TRoutes, TName>> & {
      readonly children?: ReactNode;
      readonly onClick?: MouseEventHandler<HTMLAnchorElement>;
      readonly onMouseEnter?: MouseEventHandler<HTMLAnchorElement>;
      readonly ref?: Ref<HTMLAnchorElement>;
      readonly to: TName;
   };
```

Runtime context:

- `href` is always derived from the router
- plain left click becomes client-side navigation
- modified click, non-left click, and `_blank` behave like a normal anchor
- hover triggers `router.prefetch()` for the computed target

#### `createHydratedRouter(routes, options?)`

Creates a browser-backed router and reads initial state from `window.__INITIAL_DATA__`.

Behavior:

- builds a browser adapter automatically
- reads the SSR payload from the hydration window
- forwards all non-adapter `RouterOptions`

Use this for the normal client-side half of SSR.

Exact option shape:

```ts
interface HydrationWindow {
   readonly [key: string]: unknown;
}

interface CreateHydratedRouterOptions<TNotFound>
   extends Omit<RouterOptions<TNotFound>, "adapter"> {
   readonly browserWindow?: HydrationWindow;
}
```

Runtime context:

- reads initial state from the `@canonical/react-ssr` initial data key
- constructs the browser adapter internally
- forwards the rest of the router options to core `createRouter()`

#### `renderToStream(router, url, options?)`

Loads a URL, renders `ServerRouter`, and returns everything needed for SSR.

Return shape:

| Field | Meaning |
|---|---|
| `stream` | Readable stream from React server rendering. |
| `loadResult` | Router load result for the request. |
| `initialData` | Dehydrated router payload or `null`. |
| `bootstrapScriptContent` | Inline script that assigns the hydration payload to the SSR window key. |

Exact shapes:

```ts
interface RenderToStreamOptions {
   readonly fallback?: ReactNode;
}

interface RenderToStreamResult<TRoutes, TNotFound> {
   readonly bootstrapScriptContent: string | null;
   readonly initialData: RouterDehydratedState<TRoutes> | null;
   readonly loadResult: RouterLoadResult<TRoutes, TNotFound>;
   readonly stream: ReadableStream;
}
```

Runtime context:

- calls `router.load(url)` first
- then calls `router.dehydrate()`
- then renders `<ServerRouter router={router} fallback={options.fallback} />`
- returns the stream and the payload you need to hydrate on the client

### Hooks

#### `useRouter()`

Returns the router from context.

Throws if no `RouterProvider` is present.

Signature:

```ts
function useRouter<TRoutes, TNotFound>(): Router<TRoutes, TNotFound>
```

#### `useNavigationState()`

Subscribes only to router navigation state and returns `"idle" | "loading"`.

Use it for global progress indicators and button disabling.

Signature:

```ts
function useNavigationState<TRoutes, TNotFound>(): "idle" | "loading"
```

#### `useRoute()`

Returns a tracked location proxy backed by the current router state.

This hook tracks which location properties your component reads and only re-renders when one of those properties changes.

Typical accessed fields include:

- `pathname`
- `url`
- `searchParams`
- `hash`

Signature:

```ts
function useRoute<TRoutes, TNotFound>(): TrackedLocation<RouterLocationState>
```

Important context:

- despite the name, this hook does **not** return the current route match object
- it returns tracked location state
- if you need the current match, read `useRouter().getState().match`

#### `useSearchParam(key)`

Subscribes only to one query-string key and returns its current string value or `null`.

Use this when a component only cares about a single query param and should not re-render for unrelated location changes.

Signature:

```ts
function useSearchParam<TRoutes, TNotFound>(key: string): string | null
```

### React package types

| Type | Meaning |
|---|---|
| `AnyReactRouter` | Broad router type used inside context plumbing. |
| `RouterProviderProps` | Props for `RouterProvider`. |
| `LinkBuildOptions` | Typed `params` / `search` / `hash` inputs for `Link`. |
| `LinkProps` | Full typed prop bag for `Link`. |
| `OutletProps` | Props for `Outlet`. |
| `ServerRouterProps` | Props for `ServerRouter`. |
| `RenderToStreamOptions` | Options for `renderToStream()`, currently `fallback`. |
| `RenderToStreamResult` | SSR result contract returned by `renderToStream()`. |
| `HydrationWindow` | Minimal window-like object used for hydration payload lookup. |
| `CreateHydratedRouterOptions` | `RouterOptions` plus optional `browserWindow`. |
| `CreateHydratedRouterWindow` | Alias of `HydrationWindow`. |
| `HydratedNavigationState` | Alias of core `RouterNavigationState`. |

### What is actually exported from `@canonical/router-react`

Runtime exports:

- `createHydratedRouter`
- `Link`
- `Outlet`
- `RouterProvider`
- `renderToStream`
- `ServerRouter`
- `useNavigationState`
- `useRoute`
- `useRouter`
- `useSearchParam`

In addition, all public React-facing types are re-exported from `types.ts`.

## Quick decision guide

If you are unsure where to look:

| Need | API |
|---|---|
| Define one route | `route()` |
| Share a shell or boundary | `wrapper()` + `group()` |
| Add cross-cutting route policy | `applyMiddleware()` |
| Redirect during loading | `redirect()` |
| Build the router | `createRouter()` |
| Run in the browser | `createBrowserAdapter()` or `createHydratedRouter()` |
| Run in tests | `createMemoryAdapter()` |
| Run for one server request | `createServerAdapter()` or `renderToStream()` |
| Render the active route in React | `RouterProvider` + `Outlet` |
| Create typed links | `Link` |
| Read router instance in React | `useRouter()` |
| Read loading state in React | `useNavigationState()` |
| Read one search param in React | `useSearchParam()` |
