# Router API reference

Complete public API for the pragma router. Two packages:

- **`@canonical/router-core`** (`packages/runtime/router`) — framework-agnostic routing engine: factories, route/wrapper/group/middleware primitives, adapters, types.
- **`@canonical/router-react`** (`packages/react/router`) — React binding: provider, `Link`, `Outlet`, hooks, SSR and hydration helpers.

Every signature below is transcribed from source. Type parameters are elided to their load-bearing form where the full constraint adds no information; defaults are preserved.

Conventions used throughout:

- `TRoutes extends RouteMap` — the application route map (`Record<string, AnyRoute>`).
- `TNotFound extends AnyRoute | undefined = undefined` — the optional not-found route.
- `TRendered` — the value a `component`/`content`/`wrapper.component` returns. The React layer fixes it to `ReactElement`; core leaves it `unknown`.

---

## @canonical/router-core

### Router factories

All four return a [`Router`](#router). `createBrowserRouter`, `createMemoryRouter`, and `createStaticRouter` wrap `createRouter` with a preset adapter. Pick by environment.

| Factory | Adapter | Use when |
|---|---|---|
| `createBrowserRouter` | `createBrowserAdapter()` (Navigation API → History API fallback) | Client, non-SSR app entry |
| `createStaticRouter` | `createServerAdapter(url)` | Server-side render of one request |
| `createMemoryRouter` | `createMemoryAdapter(initialUrl)` | Tests and non-DOM environments |
| `createRouter` | none unless you pass `adapter` | Custom adapter / low-level control |

#### `createRouter`

```ts
function createRouter<
  const TRoutes extends RouteMap,
  const TNotFound extends AnyRoute | undefined = undefined,
>(
  routes: TRoutes,
  options?: RouterOptions<TNotFound>,
): Router<TRoutes, TNotFound>;
```

Base factory. Applies `options.middleware` to the route map, asserts unique wrapper ids, wires accessibility managers, and constructs the store. Every other factory delegates here.

```ts
const router = createRouter(appRoutes, { adapter: myAdapter, notFound: notFoundRoute });
```

#### `createBrowserRouter`

```ts
function createBrowserRouter<
  const TRoutes extends RouteMap,
  const TNotFound extends AnyRoute | undefined = undefined,
>(
  routes: TRoutes,
  options?: Omit<RouterOptions<TNotFound>, "adapter">,
): Router<TRoutes, TNotFound>;
```

Client router. Injects `createBrowserAdapter()` (Navigation API where available, History API otherwise). `options` omits `adapter`.

```ts
const router = createBrowserRouter(appRoutes, {
  middleware: [...middleware],
  notFound: notFoundRoute,
});
```

#### `createStaticRouter`

```ts
function createStaticRouter<
  const TRoutes extends RouteMap,
  const TNotFound extends AnyRoute | undefined = undefined,
>(
  routes: TRoutes,
  url: string | URL,
  options?: Omit<RouterOptions<TNotFound>, "adapter" | "initialUrl">,
): Router<TRoutes, TNotFound> & {
  readonly match: RouterMatch<TRoutes, TNotFound> | null;
};
```

SSR router. Matches `url` synchronously and hydrates the store so `render()`/`<Outlet>` work without awaiting `load()`; prefetch fires in the background. The returned object adds a `match` field for status-code and redirect decisions before rendering. `options` omits `adapter` and `initialUrl`.

```ts
const router = createStaticRouter(appRoutes, req.url, {
  middleware: [...middleware],
  notFound: notFoundRoute,
});

if (!router.match) {
  res.status(404);
} else if (router.match.kind === "redirect") {
  return res.redirect(router.match.status, router.match.redirectTo);
}
```

#### `createMemoryRouter`

```ts
function createMemoryRouter<
  const TRoutes extends RouteMap,
  const TNotFound extends AnyRoute | undefined = undefined,
>(
  routes: TRoutes,
  initialUrl: string | URL = "/",
  options?: Omit<RouterOptions<TNotFound>, "adapter">,
): Router<TRoutes, TNotFound>;
```

In-memory router for tests. Injects `createMemoryAdapter(initialUrl)`, whose adapter additionally exposes `back()` / `forward()`. `initialUrl` defaults to `"/"`.

```ts
const router = createMemoryRouter(appRoutes, "/account?auth=1");
await router.load(router.getState().location.url);
```

### `RouterOptions`

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

`accessibility` configures focus, route announcement, scroll restoration, and view transitions (each `false` to disable); see `RouterAccessibilityOptions` in `types.ts`. `hydratedState` resumes from a dehydrated SSR snapshot.

### `Router`

The router instance. Selected members (full surface in `types.ts`, lines 586–636):

```ts
interface Router<TRoutes extends RouteMap, TNotFound extends AnyRoute | undefined = undefined> {
  readonly routes: TRoutes;
  readonly notFound: TNotFound;
  readonly adapter: PlatformAdapter | null;
  readonly store: RouterStore<TRoutes, TNotFound>;
  getRoute<TName extends RouteName<TRoutes>>(name: TName): RouteOf<TRoutes, TName>;
  getState(): RouterState<TRoutes, TNotFound>;
  getTrackedLocation(onAccess: (key: RouterLocationKey) => void): TrackedLocation<RouterLocationState>;
  buildPath: BuildPathFn<TRoutes>;                       // (name, options?) => string
  dehydrate(): RouterDehydratedState<TRoutes> | null;
  dispose(): void;
  hydrate(state: RouterDehydratedState<TRoutes>): RouterLoadResult<TRoutes, TNotFound>;
  load(url: string | URL): Promise<RouterLoadResult<TRoutes, TNotFound>>;
  match(url: string | URL): RouterMatch<TRoutes, TNotFound> | null;
  navigate: NavigateFn<TRoutes>;                         // (name, options?) => NavigationIntent
  prefetch: PrefetchFn<TRoutes>;                         // (name, options?) => Promise<void>
  registerBlocker(blocker: RouterBlocker): void;
  unregisterBlocker(id: string): void;
  readonly blockerState: "idle" | "blocked";
  proceedNavigation(): void;
  cancelNavigation(): void;
  render(result?: RouterLoadResult<TRoutes, TNotFound> | null): unknown;
  setSearchParams(
    params:
      | Record<string, string | null>
      | ((current: Record<string, string>) => Record<string, string | null>),
    options?: { readonly replace?: boolean },
  ): void;
  subscribe(listener: (snapshot: RouterSnapshot<TRoutes, TNotFound>) => void): () => void;
  subscribeToNavigation(listener: (state: RouterNavigationState, previousState: RouterNavigationState) => void): () => void;
  subscribeToSearchParam(key: string, listener: (value: string | null, previousValue: string | null) => void): () => void;
}
```

- **`navigate(name, options?)`** and **`buildPath(name, options?)`** take a route name and `PathBuildOptions`. `params` is required at the type level iff the route's `url` contains `:params`; `search`, `hash`, and `replace` are optional. `navigate` returns a `NavigationIntent` (`{ name, href, params, search, hash? }`); `buildPath` returns the built path string.
- **`prefetch(name, options?)`** returns `Promise<void>` — warms the route's `prefetch` hook ahead of navigation.
- **`render(result?)`** invokes the matched route's UI slot (`component` or the deprecated `content`) and `wrappers` as plain function calls and returns the composed result. React consumers must **not** call it during a component render — hooks the slot functions call would attach to the caller's fiber; `<Outlet>` constructs elements from the match itself instead.
- **`render()` returns `unknown`**, not a React element — typing is supplied by `TRendered` on `component`/`content`/`wrapper.component`.

```ts
router.navigate("account", { search: { auth: "1" } });
const href = router.buildPath("guide", { params: { slug: "intro" } });
await router.prefetch("home");
```

### Route definition — `route`

```ts
// Redirect overload (matched first; presence of `redirect` selects it):
function route<
  const TPath extends string,
  TTarget extends string,
  TWrappers extends readonly AnyWrapper[] = readonly [],
  TParamsSchema extends SchemaLike<unknown> | undefined = undefined,
>(
  definition: RedirectRouteInput<TPath, TTarget, TWrappers, TParamsSchema>,
): RedirectRouteDefinition<TPath, TTarget, TWrappers, TParamsSchema>;

// Data overload:
function route<
  const TPath extends string,
  TSearchSchema extends SchemaLike<unknown> | undefined = undefined,
  TRendered = unknown,
  TWrappers extends readonly AnyWrapper[] = readonly [],
  TParamsSchema extends SchemaLike<unknown> | undefined = undefined,
>(
  definition: DataRouteInput<TPath, TSearchSchema, TRendered, TWrappers, TParamsSchema>,
): DataRouteDefinition<TPath, TSearchSchema, TRendered, TWrappers, TParamsSchema>;
```

Constructs one flat route and derives its path codec. The returned definition adds `parse(url) → params | null` and `render(params) → string` over the input, and defaults `wrappers` to `[]`. Routes are **flat** — there is no nesting or `children`. Shared layout comes from [`wrapper`](#wrapper) + [`group`](#group); cross-cutting logic from [middleware](#middleware--applymiddleware).

A data route declares its UI through **exactly one** of `component` (preferred) or the deprecated `content` — `route()` throws when both or neither are declared. Redirect routes declare neither.

#### `DataRouteInput`

```ts
interface DataRouteInput<TPath, TSearchSchema, TRendered, TWrappers, TParamsSchema> {
  readonly url: TPath;
  readonly component?: RouteComponent<TPath, TSearchSchema, TRendered, TParamsSchema>;
  /** @deprecated Render-function form; prefer `component` — see AV-340. */
  readonly content?: RouteContent<TPath, TSearchSchema, TRendered, TParamsSchema>;
  readonly prefetch?: BivariantCallback<
    [params: InferParams<TPath, TParamsSchema>, search: InferSearch<TSearchSchema>, context: NavigationContext],
    void | Promise<void>
  >;
  readonly params?: TParamsSchema;
  readonly search?: TSearchSchema;
  readonly wrappers?: TWrappers;
  readonly meta?: Readonly<Record<string, unknown>>;
  readonly fallback?: unknown;
  readonly errorComponent?: RouteErrorComponent;
}
```

- **`url`** — path pattern. `:param` segments become typed params; modifiers (`?`, `*`, `+`, `(regex)`) are stripped for naming. `RouteParams<TPath>` infers `{ readonly [name]: string }`, or `Record<string, never>` when the path has none.
- **`component`** — the route's UI as a component receiving `RouteContentProps` (`{ params, search }`). Rendered with its own fiber by `router-react`'s `Outlet`, so hooks are legal inside; bare references and element-creating arrows are both valid. Carries an optional `preload?: () => Promise<RouteModule>` for code-splitting. `RouteComponent` is structurally identical to `RouteContent` — the difference is contractual.
- **`content`** — **deprecated** render-function form of the UI slot (AV-340); accepts the same shape as `component` and keeps working during migration.
- **`prefetch`** — see [the prefetch hook](#the-prefetch-hook).
- **`params`** — a [Standard Schema](#params-validation) validator for the path params; its output type replaces `RouteParams<TPath>` everywhere (`component`, `prefetch`, `Link`, `navigate`, `buildPath`). A failed validation makes the URL a **non-match** (404), not an error.
- **`search`** — a [Standard Schema](#search-validation) validator; its output type flows to the component's `search` prop and the route's `SearchOf`. A failed validation throws a 400 `StatusResponse`.
- **`wrappers`** — layout wrappers (usually applied via `group`, not set by hand).
- **`meta`** — arbitrary readonly metadata.
- **`fallback`** — adapter-interpreted pending UI (a `ReactNode` in `router-react`) shown while the route's suspended output resolves, overriding the `Outlet`-level default.
- **`errorComponent`** — a component receiving `{ error }`, composed behind a route-keyed error boundary by `router-react`'s `Outlet`; core never invokes it.

```ts
const account = route({
  url: "/account",
  search: accountSearchSchema,
  component: AccountPage,
});
```

#### `RouteContentProps`

Props passed to a route's `component` (and the deprecated `content`):

```ts
interface RouteContentProps<
  TParams = Record<string, never>,
  TSearch = Record<string, never>,
> {
  readonly params: TParams;
  readonly search: TSearch;
}
```

```ts
function AccountPage({ params, search }: RouteContentProps<{ readonly id: string }, { auth?: string }>) {
  return <p>{params.id} {search.auth}</p>;
}
```

#### The `prefetch` hook

`prefetch` is the **only** data hook — there is no `fetch` field anywhere. It is fire-and-forget: the router does **not** block render on it or feed its result to the component. Use it to warm an external cache (Relay, TanStack Query, SWR) or preload assets at navigation time; components own their own data.

```ts
readonly prefetch?: (
  params: InferParams<TPath, TParamsSchema>,
  search: InferSearch<TSearchSchema>,
  context: NavigationContext,
) => void | Promise<void>;
```

The third argument is the navigation context:

```ts
interface NavigationContext {
  readonly signal: AbortSignal;   // aborts when the navigation is superseded
}
```

Throwing inside `prefetch` is meaningful: throw a [`StatusResponse`](#statusresponse) for an HTTP-like error, or call [`redirect()`](#runtime-redirects--redirect-redirect-routeredirect) to short-circuit navigation. Both propagate to standard React error boundaries on the client and to the server handler under SSR.

```ts
prefetch: (params, search, context) => {
  void queryClient.prefetchQuery({
    queryKey: ["user", params.id],
    queryFn: ({ signal }) => fetchUser(params.id, signal),
    signal: context.signal,
  });
},
```

#### `RedirectRouteInput` — static redirect routes

```ts
type StaticRedirectStatus = 301 | 308;

interface RedirectRouteInput<TPath, TTarget, TWrappers, TParamsSchema> {
  readonly url: TPath;
  readonly redirect: TTarget;       // destination path
  readonly status: StaticRedirectStatus;
  readonly params?: TParamsSchema;  // optional params schema, gates matching like data routes
  readonly wrappers?: TWrappers;
  readonly meta?: Readonly<Record<string, unknown>>;
}
```

A route with no UI slot (neither `component` nor `content`). The `status` is restricted to permanent redirects (`301 | 308`) — distinct from the runtime [`redirect()`](#runtime-redirects--redirect-redirect-routeredirect) helper's wider union. Matched ahead of data routes by the presence of `redirect`.

```ts
const legacy = route({ url: "/old", redirect: "/new", status: 308 });
```

#### Definition shapes and codec

`RouteInput = DataRouteInput | RedirectRouteInput` (what `route()` accepts); `RouteDefinition = DataRouteDefinition | RedirectRouteDefinition` (what it returns). Both definitions extend `RouteCodec<TPath, TParams>`:

```ts
interface RouteCodec<TPath extends string = string, TParams = RouteParams<TPath>> {
  parse(url: string | URL): TParams | null;
  render(params: TParams): string;
}
```

`TParams` is `InferParams<TPath, TParamsSchema>` — the [params schema](#params-validation)'s output when one is declared, otherwise the raw string params inferred from the path. `parse` applies the params schema: a rejected URL returns `null`, exactly like a pattern mismatch. `render` accepts the schema's output values and serializes non-string values (numbers, booleans) with `String()`.

The definition is the input shape with `wrappers` made required (defaulted to `[]`) plus `parse`/`render`. `DataRouteDefinition` keeps the same three-arg `prefetch` signature as the input.

### Composition — `wrapper`, `group`

A **wrapper** is a reusable layout shell; **`group`** applies one wrapper to a list of routes. This replaces nested layout routes.

#### `wrapper`

```ts
function wrapper<TRendered = unknown>(
  definition: WrapperDefinition<TRendered>,
): WrapperDefinition<TRendered>;
```

Identity passthrough that fixes the single type parameter `TRendered`. The definition:

```ts
interface WrapperDefinition<TRendered = unknown> {
  readonly id: string;                                          // must be unique across the route map
  readonly component: (props: WrapperComponentProps<TRendered>) => TRendered;
  readonly prefetch?: (params: RouteParamValues, context: NavigationContext) => void | Promise<void>;
}

interface WrapperComponentProps<TRendered = unknown> {
  readonly children: TRendered;
}
```

Note the wrapper `prefetch` takes **two** args `(params, context)` — no `search`, unlike route `prefetch`. Wrapper prefetches are fire-and-forget and not cached. Wrappers are shared across routes, so `params` is always the **raw string params** extracted from the URL (`RouteParamValues`) — a route's [params schema](#params-validation) only transforms what the route's own hooks receive.

```ts
const publicLayout = wrapper<ReactElement>({
  id: "public-layout",
  component: ({ children }) => (
    <div className="app-shell">
      <header><Navigation /></header>
      <main>{children}</main>
    </div>
  ),
});
```

#### `group`

```ts
function group<TWrapper extends AnyWrapper, TRoutes extends readonly AnyRoute[]>(
  nextWrapper: TWrapper,
  routes: TRoutes,
): GroupedRoutes<TWrapper, TRoutes>;
```

Prepends `nextWrapper` to every route's `wrappers` array and returns the rewrapped list (positionally typed, so destructuring preserves each route's type). Nest `group(...)` calls to stack wrappers (outermost wrapper outermost).

```ts
const [account, login] = group(publicLayout, [
  accountRoutes.account,
  accountRoutes.login,
] as const);
```

#### The publicLayout pattern

Assemble routes flat, attach shared layout with `group`, then collect into a route map:

```ts
const [guide, home] = group(publicLayout, [marketingRoutes.guide, marketingRoutes.home] as const);
const [account, login] = group(publicLayout, [accountRoutes.account, accountRoutes.login] as const);

const appRoutes = { guide, home, account, login } as const;
export type AppRoutes = typeof appRoutes;
```

### Middleware — `applyMiddleware`

A **`RouteMiddleware`** is a route endomorphism applied before the router is built. Use it for auth, i18n, analytics — anything cross-cutting that rewrites routes.

```ts
type RouteMiddleware = <TRoute extends AnyRoute>(route: TRoute) => TRoute;
```

#### `applyMiddleware`

```ts
function applyMiddleware<TRoutes extends readonly AnyRoute[]>(
  routes: TRoutes,
  middleware: readonly RouteMiddleware[],
): TRoutes;
```

Applies each middleware to each route with **outermost-first** array semantics (the first entry runs last, wrapping the rest), then rebuilds `parse`/`render` from the possibly-changed `url`. `createRouter` runs this internally over `options.middleware`, so passing `middleware` to a factory is equivalent; call `applyMiddleware` directly only when manipulating a route array outside a router.

#### Middleware contract (the `withAuth` pattern)

A middleware that guards protected paths wraps the route's existing `prefetch`, preserving it for the authorised case:

```ts
export function withAuth(loginPath: string): RouteMiddleware {
  return ((currentRoute: AnyRoute) => {
    if (!protectedPaths.has(currentRoute.url)) {
      return currentRoute;                          // leave unprotected routes untouched
    }

    const currentPrefetch = currentRoute.prefetch;  // preserve the original

    return {
      ...currentRoute,
      prefetch: (params: unknown, search: unknown, context: NavigationContext) => {
        if (!hasDemoAuth(search)) {
          const from = currentRoute.render((params ?? {}) as RouteParamValues | Record<string, never>);
          redirect(`${loginPath}?from=${encodeURIComponent(from)}`, 302);  // throws RouteRedirect
        }
        if (currentPrefetch) {
          return currentPrefetch(params, search, context);
        }
      },
    };
  }) as RouteMiddleware;
}

export const middleware = [withAuth("/login")] as const;
```

Wire it into both entries:

```ts
createBrowserRouter(appRoutes, { middleware: [...middleware], notFound: notFoundRoute });   // client
createStaticRouter(appRoutes, url, { middleware: [...middleware], notFound: notFoundRoute }); // server
```

For a server-side pre-render decision that must not throw, mirror the same logic in a pure helper that returns the redirect href or `null`:

```ts
function getAuthRedirectHref(input: string | URL): string | null {
  const url = input instanceof URL ? input : new URL(input, "https://router.local");
  if (!protectedPaths.has(url.pathname) || hasDemoAuth({ auth: url.searchParams.get("auth") })) {
    return null;
  }
  return `/login?from=${encodeURIComponent(url.pathname)}`;
}
```

### Runtime redirects — `redirect`, `Redirect`, `RouteRedirect`

> **`Redirect` is not a React component.** It is the `RouteRedirect` class, re-exported from `@canonical/router-core` under the name `Redirect`. There is no `<Redirect>` element. Use these as the throwable redirect primitives inside a `prefetch`/`fetch`-time hook.

#### `redirect`

```ts
function redirect(to: string, status: 301 | 302 | 307 | 308 = 302): never;
```

Throws a `RouteRedirect` to short-circuit navigation from inside a route or wrapper `prefetch` (or middleware). Status union is **wider** than static redirect routes (which only allow `301 | 308`); default is `302`.

```ts
redirect(`/login?from=${encodeURIComponent(from)}`, 302);
```

#### `RouteRedirect` (exported as `Redirect`)

```ts
class RouteRedirect {        // export { default as Redirect } from "./RouteRedirect.js"
  readonly to: string;
  readonly status: 301 | 302 | 307 | 308;
  constructor(to: string, status: 301 | 302 | 307 | 308 = 302);
}
```

The throwable value `redirect()` constructs. Catch it (or read `router.match` / `RedirectRouteMatch`) on the server to emit a real HTTP redirect.

### `StatusResponse`

```ts
class StatusResponse<TData = unknown> {
  readonly status: number;
  readonly data: TData;
  constructor(status: number, data: TData);
}
```

A typed non-success status thrown from a `prefetch`. Surfaces to React error boundaries (client) or the SSR handler (server) for HTTP-like error UI.

```ts
prefetch: async (params) => {
  const user = await fetchUser(params.id);
  if (!user) throw new StatusResponse(404, { id: params.id });
},
```

### Schema validation

Both `params` and `search` accept a `SchemaLike` validator:

```ts
type SchemaLike<TOutput = unknown> =
  | StandardSchemaV1<unknown, TOutput>   // the real spec — Zod (≥3.24), Valibot, ArkType
  | StandardSchemaLike<TOutput>;         // legacy hand-rolled shape (kept for back-compat)

interface StandardSchemaV1<TInput = unknown, TOutput = TInput> {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown) =>
      | StandardSchemaResult<TOutput>
      | Promise<StandardSchemaResult<TOutput>>;   // Promise results are rejected — matching is synchronous
    readonly types?: { readonly input: TInput; readonly output: TOutput } | undefined;
  };
}

type StandardSchemaResult<TOutput> =
  | { readonly value: TOutput; readonly issues?: undefined }
  | { readonly issues: ReadonlyArray<StandardSchemaIssue> };

interface StandardSchemaLike<TOutput = unknown> {
  readonly "~standard": {
    readonly output?: TOutput;
    readonly validate?: (value: unknown) => unknown;
  };
}
```

Any [Standard Schema](https://standardschema.dev)-compatible library schema can be passed directly — its output type is inferred from the `types.output` phantom (`InferOutput`). The legacy shape carries its output type on the non-standard `output` phantom instead. Two constraints apply to both:

- **Validation is synchronous.** `match()` is sync, so a validator that returns a `Promise` (e.g. a Zod async refinement) throws at match time with an explanatory error.
- **Raw values are strings.** Path params and search params arrive as `Record<string, string>`; use coercion (`z.coerce.number()`, `Number(...)`) for anything else.

#### Params validation

`params` validates the path params extracted from the URL. The schema's output type replaces `RouteParams<TPath>` everywhere: the route component's `params` prop, `prefetch`'s first argument, `ParamsOf<TRoute>`, and the `params` accepted by `Link`, `navigate`, and `buildPath`.

**Failure semantics: a rejected URL is a non-match, not an error.** Matching falls through to the next candidate route and ultimately the `notFound` route (404) — the same behaviour as a pattern mismatch. Use it to reject syntactically invalid resource identifiers before any code runs:

```ts
const productParamsSchema: StandardSchemaV1<
  { readonly id: string },
  { readonly id: number }
> = {
  "~standard": {
    version: 1,
    vendor: "app",
    validate(value) {
      const raw = value as { id?: string };
      const id = Number(raw.id);
      return Number.isInteger(id) && id > 0
        ? { value: { id } }
        : { issues: [{ message: "id must be a positive integer" }] };
    },
  },
};

const product = route({
  url: "/products/:id",
  params: productParamsSchema,   // "/products/abc" → 404; "/products/42" → params.id === 42
  component: ProductPage,        // ({ params }) — params.id is a number
});

router.buildPath("product", { params: { id: 42 } });   // "/products/42" — typed, serialized with String()
```

For *semantic* validation (does the record exist?), keep using `prefetch` + [`StatusResponse`](#statusresponse). For simple syntactic constraints, a `(regex)` modifier in the pattern (`/products/:id(\\d+)`) also works — `params` adds typed coercion on top.

#### Search validation

`search` validates the query string. Its output type flows to the route component's `search` prop and to `SearchOf<TRoute>`.

**Failure semantics: a rejected query string throws `StatusResponse(400, { issues, message })`.** During `load()`/navigation the router catches it and commits an error result (`result.status === 400`, `result.error instanceof StatusResponse`); under SSR that surfaces as a real 400, and on the client it reaches your error boundary. A shared URL with a garbage query is a *bad request*, not a crash — and for that reason, prefer **normalizing** schemas that supply defaults over rejecting ones (`z.coerce.number().catch(1)` rather than `.int()` alone), reserving hard failure for genuinely unrenderable input.

```ts
const accountSearchSchema = {
  "~standard": {
    output: {} as { readonly auth?: string },
    validate(value: unknown): { readonly auth?: string } {
      const record = value as Record<string, unknown>;
      return { auth: typeof record.auth === "string" ? record.auth : undefined };
    },
  },
};
```

This hand-rolled legacy shape never fails (it normalizes), which makes it a good dependency-free default. A type-only schema (`output` phantom, no `validate`) passes the raw string record through unvalidated.

### Adapters and low-level helpers

Also exported from `@canonical/router-core`:

```ts
function createBrowserAdapter(): PlatformAdapter;                          // Navigation API → History API
function createHistoryAdapter(browserWindow?): PlatformAdapter;           // History API
function createNavigationAdapter(navigationWindow?): PlatformAdapter;     // Navigation API
function createServerAdapter(initialUrl: string | URL): PlatformAdapter;
function createMemoryAdapter(initialUrl: string | URL = "/"): MemoryAdapter;
function createRouterStore<TRoutes, TNotFound>(
  resolveMatch: (input: string | URL) => RouterMatch<TRoutes, TNotFound> | null,
  initialUrl: string | URL = "/",
): RouterStore<TRoutes, TNotFound>;
function createSubject<TValue>(): Subject<TValue>;
function createTrackedLocation<TLocation extends object>(
  location: TLocation,
  onAccess: (key: Extract<keyof TLocation, RouterLocationKey>) => void,
): TrackedLocation<TLocation>;
```

```ts
interface PlatformAdapter {
  getLocation(): string | URL;
  navigate(url: string, options?: PlatformNavigateOptions): void;
  subscribe(callback: (location: string | URL) => void): () => void;
}
interface MemoryAdapter extends PlatformAdapter {
  back(): void;
  forward(): void;
}
```

### Supporting types

| Type | Shape / meaning |
|---|---|
| `RouteMap` | `Record<string, AnyRoute>` |
| `RouterState` | `{ location: RouterLocationState; match: RouterMatch \| null; navigation: { state } }` |
| `RouterLocationState` | `{ hash; href; pathname; searchParams: URLSearchParams; status; url: URL }` |
| `RouterNavigationState` | `"idle" \| "loading"` |
| `RouterMatch` | union of `DataRouteMatch` (`kind: "route"`, `status: 200`), `RedirectRouteMatch` (`kind: "redirect"`, `redirectTo`, `status`), `NotFoundRouteMatch` (`kind: "not-found"`, `status: 404`) |
| `RouterDehydratedState` | `{ href; kind: "route" \| "not-found" \| "unmatched"; routeId; status }` |
| `RouterLoadResult` | `{ dehydrate(); error; location; match; status }` (returned by `load`/`hydrate`) |
| `PathBuildOptions<TRoute>` | `{ params?; search?; hash?; replace? }` — `params` required iff the path has params |
| `NavigationIntent` | `{ name; href; params; search; hash? }` (returned by `navigate`) |
| `TrackedLocation<T>` | proxy over a location; reading a field subscribes to just that field |
| `Subject<T>` | `{ next(value); subscribe(subscriber) → unsubscribe }` |
| `SchemaLike<TOutput>` | `StandardSchemaV1<unknown, TOutput> \| StandardSchemaLike<TOutput>` — what `params`/`search` accept |
| `InferOutput<TSchema>` | a schema's output type (`types.output` phantom, or legacy `output`) |
| `InferParams<TPath, TParamsSchema>` | params schema output when declared, else `RouteParams<TPath>` |
| `ParamsOf<TRoute>` | the route's params as seen by `component`/`Link`/`navigate` (schema-aware) |
| `SearchOf<TRoute>` | the route's validated search shape (schema-aware) |
| `StandardSchemaIssue` | `{ message?; path? }` — one validation issue; `message` optional to tolerate legacy validators |

---

## @canonical/router-react

### `RouterProvider`

```ts
interface RouterProviderProps<TRoutes extends RouteMap, TNotFound extends AnyRoute | undefined = undefined> {
  readonly children?: ReactNode;
  readonly router: Router<TRoutes, TNotFound>;
}

function RouterProvider<TRoutes, TNotFound>(
  props: RouterProviderProps<TRoutes, TNotFound>,
): ReactElement;
```

Supplies a router instance through React context. Required ancestor for `Link`, `Outlet`, and all hooks.

```tsx
<RouterProvider router={router}>
  <Outlet fallback={<p>Loading…</p>} />
</RouterProvider>
```

### `Link`

```ts
function Link<
  TRoutes extends RouteMap = RegisteredRouteMap,
  TName extends RouteName<TRoutes> = RouteName<TRoutes>,
>(props: LinkProps<TRoutes, TName>): ReactElement;
```

A `forwardRef` anchor that builds `href` from a **typed route name**. Intercepts primary-button clicks → `router.navigate()`, hover (`onMouseEnter`) → `router.prefetch()`, and sets `aria-current="page"` when its target matches the current pathname. Modified clicks, `download`, and `target` fall through to native anchor behaviour.

```ts
type LinkProps<TRoutes, TName> =
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
  LinkBuildOptions<RouteOf<TRoutes, TName>> & {
    readonly children?: ReactNode;
    readonly download?: AnchorHTMLAttributes<HTMLAnchorElement>["download"];
    readonly onClick?: MouseEventHandler<HTMLAnchorElement>;
    readonly onMouseEnter?: MouseEventHandler<HTMLAnchorElement>;
    readonly ref?: Ref<HTMLAnchorElement>;
    readonly to: TName;          // the named route
  };

type LinkBuildOptions<TRoute> = {
  readonly hash?: string;
  readonly replace?: boolean;
  readonly search?: SearchOf<TRoute>;
} & (HasParams<TRoute> extends true
  ? { readonly params: ParamsOf<TRoute> }      // required iff the route has params
  : { readonly params?: ParamsOf<TRoute> });
```

```tsx
<Link to="account" search={{ auth: "1" }}>Account</Link>
<Link to="guide" params={{ slug: "intro" }} replace>Guide</Link>
```

### `Outlet`

```ts
interface OutletProps {
  readonly fallback?: ReactNode;
}

function Outlet({ fallback = null }: OutletProps): ReactElement;
```

Renders the matched route subtree by constructing elements from the route's `component` (or the deprecated `content`) and its `wrappers` — each gets its own React fiber, so hooks are legal in both. Rerenders only when the location `href` or `match` changes — not on `idle → loading` transitions. Output is wrapped in `<Suspense key={routeName} fallback={fallback}>`; a route-level `fallback` overrides the prop within that Suspense. A route-level `errorComponent` renders with `{ error }` behind an internal route-keyed error boundary (reset by navigating to a different route); without one, render errors propagate **past** `Outlet` — wrap it in an error boundary to catch them.

```tsx
<Outlet fallback={<p>Loading…</p>} />
```

### Hooks

All default their generics to `RegisteredRouteMap` / `RegisteredNotFound` (see [`register`](#register--typed-routing-without-generics)), so once you register your routes no generics are needed. Each subscribes to the narrowest channel it needs.

#### `useRouter`

```ts
function useRouter<TRoutes = RegisteredRouteMap, TNotFound = RegisteredNotFound>(): Router<TRoutes, TNotFound>;
```

The raw router from the nearest provider. Throws if no provider is present. Use for imperative `navigate`/`buildPath`/`prefetch`.

```ts
const router = useRouter();
router.navigate("home");
```

#### `useRoute`

```ts
function useRoute<TRoutes = RegisteredRouteMap, TNotFound = RegisteredNotFound>(): TrackedLocation<RouterLocationState>;
```

The current location as a tracked proxy. Reading a field (e.g. `pathname`) subscribes the component to **only** that field.

```ts
const { pathname, searchParams } = useRoute();
```

#### `useRouteParams` / `useRouteSearch`

```ts
function useRouteParams<TRoute extends AnyRoute>(route: TRoute): ParamsOf<TRoute>;
function useRouteSearch<TRoute extends AnyRoute>(route: TRoute): SearchOf<TRoute>;
```

The current match's params / schema-validated search data, typed by inference from the route argument's generics. The route object is a **type witness**: passing it asserts the hook runs under that route's subtree (its `component` or `wrappers`); route identity is not verified at runtime. Unmatched states return a frozen empty object. Rerenders track the match's params/search object identity — unrelated store changes cost nothing.

```ts
function DocPage() {
  const { slug } = useRouteParams(docsRoute);   // string — from the url pattern
  const { page } = useRouteSearch(docsRoute);   // number — from the search schema
  ...
}
```

#### `useRouterState`

```ts
function useRouterState<TRoutes, TNotFound>(): RouterState<TRoutes, TNotFound>;
function useRouterState<TRoutes, TNotFound, TSelected>(
  selector: (state: RouterState<TRoutes, TNotFound>) => TSelected,
  options?: UseRouterStateOptions<TSelected>,   // { isEqual?: (previous, next) => boolean }
): TSelected;
```

Power-user state subscription. Without a selector, returns the whole `RouterState`. With one, returns the narrowed slice and rerenders only when it changes (compared with `isEqual`, default `Object.is`).

```ts
const status = useRouterState((state) => state.match?.status ?? 200);
```

#### `useNavigationState`

```ts
function useNavigationState<TRoutes, TNotFound>(): RouterNavigationState;   // "idle" | "loading"
```

Subscribes only to the navigation channel. Use for pending/loading UI.

```ts
const navState = useNavigationState();
return navState === "loading" ? <Spinner /> : <Content />;
```

#### `useSearchParam`

```ts
function useSearchParam<TRoutes, TNotFound>(key: string): string | null;
```

A single search-param value; subscribes to that key only.

```ts
const auth = useSearchParam("auth");
```

#### `useSearchParams`

```ts
function useSearchParams(): URLSearchParams;
function useSearchParams<_TRoutes, _TNotFound, const TKeys extends readonly string[]>(
  keys: TKeys,
): SearchParamValues<TKeys>;

type SearchParamValues<TKeys> = Readonly<{ [K in TKeys[number]]: string | null }>;
```

With no args, returns the full `URLSearchParams`. With a `keys` tuple, returns a record of just those keys and subscribes only to them.

```ts
const params = useSearchParams();                 // URLSearchParams
const { auth, from } = useSearchParams(["auth", "from"] as const);
```

#### `useBlocker`

```ts
interface BlockerState {
  readonly state: "idle" | "blocked";
  proceed(): void;
  cancel(): void;
}

function useBlocker(isActive: boolean): BlockerState;
```

Registers a navigation blocker while `isActive` is true. When a navigation is attempted, `state` becomes `"blocked"`; call `proceed()` to continue or `cancel()` to stay.

```tsx
const blocker = useBlocker(form.isDirty);
return blocker.state === "blocked" ? (
  <div role="dialog">
    <button onClick={blocker.proceed}>Leave</button>
    <button onClick={blocker.cancel}>Stay</button>
  </div>
) : null;
```

### `createHydratedRouter`

```ts
interface CreateHydratedRouterOptions<TNotFound extends AnyRoute | undefined>
  extends Omit<RouterOptions<TNotFound>, "adapter"> {
  readonly browserWindow?: HydrationWindow;
}

function createHydratedRouter<
  const TRoutes extends RouteMap,
  const TNotFound extends AnyRoute | undefined = undefined,
>(
  routes: TRoutes,
  options?: CreateHydratedRouterOptions<TNotFound>,
): Router<TRoutes, TNotFound>;
```

Browser router that resumes from dehydrated SSR state read off `window` (key `INITIAL_DATA_KEY`). Injects `createHistoryAdapter` and passes the read state as `hydratedState`. Use as the client entry of an SSR app instead of `createBrowserRouter`. `browserWindow` overrides the source of the hydration payload (defaults to `window`).

```ts
const router = createHydratedRouter(appRoutes, { middleware: [...middleware], notFound: notFoundRoute });
```

### `renderToStream`

```ts
interface RenderToStreamOptions {
  readonly fallback?: ReactNode;
}
interface RenderToStreamResult<TRoutes, TNotFound> {
  readonly bootstrapScriptContent: string | null;   // inline script that assigns window[INITIAL_DATA_KEY]
  readonly initialData: RouterDehydratedState<TRoutes> | null;
  readonly loadResult: RouterLoadResult<TRoutes, TNotFound>;
  readonly stream: ReadableStream;
}

function renderToStream<TRoutes extends RouteMap, TNotFound extends AnyRoute | undefined = undefined>(
  router: Router<TRoutes, TNotFound>,
  url: string | URL,
  options?: RenderToStreamOptions,
): Promise<RenderToStreamResult<TRoutes, TNotFound>>;
```

SSR helper. Calls `router.load(url)`, then `renderToReadableStream` of `<RouterProvider><Outlet/></RouterProvider>`. Returns the stream plus dehydrated state and a bootstrap script for client hydration (pairs with `createHydratedRouter`).

```ts
const { stream, bootstrapScriptContent, loadResult } = await renderToStream(router, req.url);
if (loadResult.status >= 400) res.status(loadResult.status);
```

### `register` — typed routing without generics

```ts
interface RouterRegister {}   // augment this

type RegisteredRouteMap = RouterRegister extends { routes: infer T extends RouteMap } ? T : RouteMap;
type RegisteredNotFound = RouterRegister extends { notFound: infer T extends AnyRoute | undefined } ? T : undefined;
```

Module-augmentation interface for ambient typing. Declare `RouterRegister.routes` (and optionally `notFound`) once, and every hook plus `Link` infers your route map — no per-call generics. Without registration the fallback is `RouteMap` (any string key: compiles, but no autocomplete or typo detection).

```ts
declare module "@canonical/router-react" {
  interface RouterRegister {
    routes: typeof appRoutes;
  }
}

// now fully typed, no generics:
<Link to="account" />;          // "account" autocompleted, typos caught
useRouter().navigate("home");
```

---

## Entry wiring (reference)

**Client** (`createBrowserRouter` or `createHydratedRouter`):

```tsx
const router = createBrowserRouter(appRoutes, { middleware: [...middleware], notFound: notFoundRoute });

hydrateRoot(
  document.getElementById("root")!,
  <RouterProvider router={router}>
    <Outlet fallback={<p>Loading…</p>} />
  </RouterProvider>,
);
```

**Server** (`createStaticRouter`, render inside the full HTML document):

```tsx
const router = createStaticRouter(appRoutes, url, { middleware: [...middleware], notFound: notFoundRoute });
// inspect router.match for status / redirect, then:
<RouterProvider router={router}>
  <Outlet fallback={<p>Loading…</p>} />
</RouterProvider>;
```

---

## See also

- [Migrating to the pragma router](../how-to-guides/MIGRATE_TO_PRAGMA_ROUTER.md)
- Router core package: `packages/runtime/router`
- Router React package: `packages/react/router`
- Reference app: `apps/react/boilerplate-vite`
