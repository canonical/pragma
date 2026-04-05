# Router API reference

This reference covers the public API exported by `@canonical/router-core` and `@canonical/router-react`.

## `@canonical/router-core`

### Constructors, functions, and classes

| Export | Purpose |
|---|---|
| `applyMiddleware()` | Apply route middleware to a route map before router creation. |
| `createBrowserAdapter()` | Bridge the router to `window.history` and `location`. |
| `createMemoryAdapter()` | In-memory history adapter for tests and non-browser runtimes. |
| `createRouter()` | Create a typed router from a route map. |
| `createRouterStore()` | Low-level state store used by the router implementation. |
| `createServerAdapter()` | Adapter for explicit server-side locations. |
| `createSubject()` | Minimal observable primitive used by the store layer. |
| `createTrackedLocation()` | Track which location keys a subscriber reads. |
| `group()` | Prepend a wrapper to a list of flat routes. |
| `redirect()` | Throw a redirect during route or wrapper loading. |
| `route()` | Define a route or redirect route with codec helpers. |
| `wrapper()` | Define a reusable wrapper for layout, data, and error handling. |
| `FocusManager` | Browser focus management after navigation. |
| `RouteAnnouncer` | Aria-live route announcements for screen readers. |
| `ScrollManager` | Scroll restoration and hash scrolling. |
| `ViewTransitionManager` | View Transitions API integration. |
| `Redirect` | Throwable redirect class used by `redirect()`. |
| `StatusResponse` | Error helper that carries an HTTP-like status code. |

### Route-definition types

| Export |
|---|
| `StandardSchemaLike` |
| `BivariantCallback` |
| `StripParamModifier` |
| `ParamNames` |
| `RouteParams` |
| `RouteParamValues` |
| `InferSearch` |
| `NavigationContext` |
| `RouteModule` |
| `RouteContentProps` |
| `RouteErrorProps` |
| `WrapperComponentProps` |
| `WrapperErrorProps` |
| `WrapperDefinition` |
| `WrapperInput` |
| `RouteCodec` |
| `AnyWrapper` |
| `RouteContent` |
| `AnyRouteContent` |
| `DataRouteInput` |
| `StaticRedirectStatus` |
| `RedirectRouteInput` |
| `RouteInput` |
| `DataRouteDefinition` |
| `RedirectRouteDefinition` |
| `RouteDefinition` |
| `AnyRoute` |
| `PrependWrapper` |
| `GroupedRoutes` |
| `RouteMiddleware` |
| `RouteMap` |
| `RouteName` |
| `RouteOf` |
| `RouteArgs` |
| `RouteIntent` |
| `UnionToIntersection` |
| `BuildPathFn` |
| `NavigateFn` |
| `PrefetchFn` |
| `ParamsOf` |
| `SearchOf` |
| `DataOf` |
| `HasParams` |
| `PathBuildOptions` |
| `PathBuildArgs` |
| `NavigationIntent` |

### Matching and state types

| Export |
|---|
| `RouteMatchBase` |
| `DataRouteMatch` |
| `RedirectRouteMatch` |
| `NotFoundRouteMatch` |
| `RouterNavigationState` |
| `RouterLocationState` |
| `RouterLocationKey` |
| `TrackedLocation` |
| `SubjectObserver` |
| `SubjectSubscriber` |
| `Subject` |
| `NamedRouteMatch` |
| `RouterMatch` |
| `RouterState` |
| `RouterSnapshot` |
| `SearchParamChange` |
| `RouterLocationChange` |
| `NavigationStateChange` |
| `RouterStore` |
| `PlatformNavigateOptions` |
| `PlatformAdapter` |
| `MemoryAdapter` |
| `RouterLoadErrorBoundary` |
| `RouterDehydratedState` |
| `RouterLoadResult` |
| `RouterOptions` |
| `Router` |

### Accessibility types

| Export |
|---|
| `RouterAccessibilityContext` |
| `FocusManagerLike` |
| `RouteAnnouncerLike` |
| `ScrollManagerLike` |
| `ViewTransitionManagerLike` |
| `RouterAccessibilityDocumentLike` |
| `RouterAccessibilityOptions` |

## `@canonical/router-react`

### Components, hooks, and helpers

| Export | Purpose |
|---|---|
| `createHydratedRouter()` | Create a browser-backed router and hydrate from `window.__INITIAL_DATA__`. |
| `Link` | Typed anchor component with hover prefetch and client-side navigation. |
| `Outlet` | Render the current route result through Suspense. |
| `RouterProvider` | Provide a router to React context. |
| `renderToStream()` | SSR helper that loads a URL and returns stream plus dehydration data. |
| `ServerRouter` | Server-side wrapper around `RouterProvider` + `Outlet`. |
| `useNavigationState()` | Subscribe to the router loading state. |
| `useRoute()` | Subscribe to the current matched route. |
| `useRouter()` | Access the router instance from context. |
| `useSearchParam()` | Subscribe to one search-param key. |

### React package types

| Export |
|---|
| `AnyReactRouter` |
| `RouterProviderProps` |
| `LinkBuildOptions` |
| `LinkProps` |
| `OutletProps` |
| `ServerRouterProps` |
| `RenderToStreamOptions` |
| `RenderToStreamResult` |
| `HydrationWindow` |
| `CreateHydratedRouterOptions` |
| `CreateHydratedRouterWindow` |
| `HydratedNavigationState` |

## Recommended reading order

1. Start with package READMEs:
   - [packages/runtime/router/README.md](../../packages/runtime/router/README.md)
   - [packages/react/router/README.md](../../packages/react/router/README.md)
2. Read the migration guide:
   - [docs/how-to-guides/MIGRATE_FROM_TANSTACK_ROUTER.md](../how-to-guides/MIGRATE_FROM_TANSTACK_ROUTER.md)
3. Use the middleware cookbook for cross-cutting policy:
   - [docs/how-to-guides/ROUTER_MIDDLEWARE_COOKBOOK.md](../how-to-guides/ROUTER_MIDDLEWARE_COOKBOOK.md)
