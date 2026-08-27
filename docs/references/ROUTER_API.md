# Router API reference

Complete public API for the pragma router. Two packages:

- **`@canonical/router-core`** (`packages/runtime/router`) — framework-agnostic routing engine: the `createRouter` constructor, route/wrapper/group/middleware primitives, platform adapters, accessibility managers, types.
- **`@canonical/router-react`** (`packages/react/router`) — React binding: provider, `Link`, `Outlet`, hooks, SSR and hydration helpers.

> **Stability: pre-1.0.** The API can change between minor versions. The design principles behind the surface — minimal API, low sugar, fire-and-forget `warm`, errors-as-state — and what is likely to change are documented in the [Design rationale](../../packages/runtime/router/README.md#design-rationale) section of the core README.

Every signature below is transcribed from source. Type parameters are elided to their load-bearing form where the full constraint adds no information; defaults are preserved.

Conventions used throughout:

- `TRoutes extends RouteMap` — the application route map (`Record<string, AnyRoute>`).
- `TNotFound extends AnyRoute | undefined = undefined` — the optional not-found route.
- `TRendered` — the value a `content`/`wrapper.component` returns. The React layer fixes it to `ReactElement`; core leaves it `unknown`.

---

## @canonical/router-core

### `createRouter` — the one constructor

```ts
function createRouter<
  const TRoutes extends RouteMap,
  const TNotFound extends AnyRoute | undefined = undefined,
>(
  routes: TRoutes,
  options?: RouterOptions<TNotFound>,
): Router<TRoutes, TNotFound>;
```

The only router constructor. Applies `options.middleware` to the route map, asserts unique wrapper ids (construction **throws** on a duplicate), wires accessibility managers, constructs the store, and — when an adapter is present — performs the initial load (or resumes from `options.hydratedState`).

**The adapter is the environment axis.** Pick one:

```ts
const router = createRouter(appRoutes, {
  adapter: createBrowserAdapter(),   // client entry
  middleware: [...middleware],
  notFound: notFoundRoute,
});
```

| Environment | Adapter |
|---|---|
| Browser (SSR or SPA client entry) | `createBrowserAdapter()` — Navigation API where available, History API otherwise |
| Browser, fragment-only routing (Storybook, static hosts) | `createHashAdapter()` |
| Server-side render of one request | `createServerAdapter(url)` |
| Tests / non-DOM environments | `createMemoryAdapter(initialUrl)` |
| Explicit History / Navigation API choice | `createHistoryAdapter()` / `createNavigationAdapter()` |

**Without an adapter, the router is a pure matcher.** Construction fires no initial load and no `warm` hooks; `match()`, `buildPath()`, and `load()` work; `navigate()` and `setSearchParams()` **throw** a descriptive error. Use an adapterless router server-side to compute statuses and redirects for a URL without side effects (see [Entry wiring](#entry-wiring-reference)).

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

- **`adapter`** — the platform adapter; see the table above. Omit for a pure matcher.
- **`accessibility`** — configures focus, route announcement, scroll restoration, and view transitions (each `false` to disable); see [`RouterAccessibilityOptions`](#accessibility).
- **`hydratedState`** — resumes from a dehydrated SSR snapshot instead of running the initial load. `hydrate()` (and therefore construction with a stale snapshot) **throws** when the snapshot doesn't match the route map — e.g. a `routeId` that no longer exists or a `kind: "route"` href that no longer matches that route. On the client, feed it from [`readDehydratedState()`](#readdehydratedstate), which returns `null` for payloads that carry no router state.
- **`initialUrl`** — the starting location **for adapterless routers only**; when an adapter is present, the adapter's `getLocation()` wins and `initialUrl` is ignored.
- **`middleware`** — applied to the route map before construction; see [Middleware](#middleware--applymiddleware).
- **`notFound`** — the route rendered for unmatched URLs (committed with status 404).

### `Router`

```ts
interface Router<TRoutes extends RouteMap, TNotFound extends AnyRoute | undefined = undefined> {
  readonly routes: TRoutes;
  readonly notFound: TNotFound;
  readonly adapter: PlatformAdapter | null;
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
  warm: WarmFn<TRoutes>;                                 // (name, options?) => Promise<void>
  block(isActive: () => boolean): RouterBlockerHandle;
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

- **`navigate(name, options?)`** and **`buildPath(name, options?)`** take a route name and `PathBuildOptions`. `params` is required at the type level iff the route's `url` contains `:params`; `search`, `hash`, and `replace` are optional. `navigate` returns a `NavigationIntent` (`{ name, href, params, search, hash? }`); `buildPath` returns the built path string. **Both `navigate` and `setSearchParams` throw on an adapterless router** — an adapterless router only matches and builds URLs.
- **`warm(name, options?)`** returns `Promise<void>` — runs the route's `warm` hook ahead of navigation and caches the resolved load per href. **The cached entry is consumed by the next navigation to that href, and the `warm` hooks do not run again for it**; the cache is cleared on every committed navigation. `Link` calls this on hover.
- **`match(url)`** is pure — it runs no hooks — but **can throw** a 400 `StatusResponse` when the matched route's [search schema](#search-validation) rejects the query string. `load()` catches that and commits it as an error result; call sites that use `match()` directly (e.g. a server disposition helper) must catch it themselves.
- **`block(isActive)`** — see [Blocking navigation](#blocking-navigation--block).
- **`render(result?)`** returns `unknown` (framework-agnostic); the React layer consumes it via `<Outlet>`. Typing is supplied by `TRendered` on `content`/`wrapper.component`.
- **`dispose()`** aborts the in-flight load and unsubscribes from the adapter.
- **`content.preload`**, when a route declares it, is **awaited during the load** — unlike `warm`, it gates navigation completion (it exists for code-splitting, where rendering without the module is impossible).

```ts
router.navigate("account", { search: { auth: "1" } });
const href = router.buildPath("guide", { params: { slug: "intro" } });
await router.warm("home");
```

### URL patterns and matching

Route paths are segment patterns:

- **Static segments** (`/account`) match exactly.
- **`:param` segments** match any single non-empty segment; the value is `decodeURIComponent`-decoded into `params`. Modifier suffixes on a param name — `?`, `*`, `+`, or a `(regex)` group — are **stripped for naming only and never evaluated**: `:id(\d+)` matches `abc` just like `:id` does, and `:section?` does **not** make the segment optional. Segment counts must match exactly (use a params schema for syntactic constraints, or a wildcard for variable depth).
- **A trailing `*` wildcard** (`/docs/*`) matches zero or more remaining segments. Wildcard segments are not captured as params and are omitted when rendering the pattern back to a path.

**Route priority** is purely structural, computed per pattern: more static segments win, then more param segments, then fewer wildcards; ties keep definition order. Redirect routes compete on the same specificity rules as data routes — a redirect route has no special precedence at match time (the `redirect` property only selects the `route()` **overload** at the type level).

**Path rendering** (`buildPath`, a route's `render`) substitutes params into the pattern, serializes non-string schema outputs with `String()`, and `encodeURIComponent`s every substituted segment; `match` decodes on the way back in. A param value containing `/` or `?` therefore round-trips as one encoded segment rather than splitting the path.

**Relative URLs get a synthetic origin.** The router resolves relative inputs against the internal base `https://router.local`, and `location.url` is that absolute `URL` object. Compare `pathname`/`search`/`hash`, not `origin` or `href`-with-origin.

### Route definition — `route`

```ts
// Redirect overload (selected by the presence of `redirect`):
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

#### `DataRouteInput`

```ts
interface DataRouteInput<TPath, TSearchSchema, TRendered, TWrappers, TParamsSchema> {
  readonly url: TPath;
  readonly content: RouteContent<TPath, TSearchSchema, TRendered, TParamsSchema>;
  readonly warm?: BivariantCallback<
    [params: InferParams<TPath, TParamsSchema>, search: InferSearch<TSearchSchema>, context: NavigationContext],
    void | Promise<void>
  >;
  readonly params?: TParamsSchema;
  readonly search?: TSearchSchema;
  readonly wrappers?: TWrappers;
  readonly meta?: Readonly<Record<string, unknown>>;
}
```

- **`url`** — path pattern; see [URL patterns and matching](#url-patterns-and-matching).
- **`content`** — the component, called with `RouteContentProps`. Carries an optional `preload?: () => Promise<RouteModule>` for code-splitting; `preload` is awaited during the load and its module is cached per route.
- **`warm`** — see [the warm hook](#the-warm-hook).
- **`params`** — a [Standard Schema](#params-validation) validator for the path params; its output type replaces `RouteParams<TPath>` everywhere (`content`, `warm`, `Link`, `navigate`, `buildPath`). A failed validation makes the URL a **non-match** (404), not an error.
- **`search`** — a [Standard Schema](#search-validation) validator; its output type flows to `content`'s `search` prop and the route's `SearchOf`. A failed validation throws a 400 `StatusResponse`.
- **`wrappers`** — layout wrappers (usually applied via `group`, not set by hand).
- **`meta`** — arbitrary readonly metadata.

```ts
const account = route({
  url: "/account",
  search: accountSearchSchema,
  content: AccountPage,
});
```

#### `RouteContentProps`

Props passed to a route's `content`:

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

#### The `warm` hook

`warm` is the **only** data hook — there is no loader anywhere. It is fire-and-forget: the router never blocks render on it and never feeds its result to the component. Use it to warm an external cache (Relay, TanStack Query, SWR) or preload assets at navigation time; components own their own data.

```ts
readonly warm?: (
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

```ts
warm: (params, search, context) => {
  void queryClient.prefetchQuery({
    queryKey: ["user", params.id],
    queryFn: ({ signal }) => fetchUser(params.id, signal),
    signal: context.signal,
  });
},
```

**Control flow from `warm`.** Throwing (or rejecting with) a [`StatusResponse`](#statusresponse), a `Response`, or the [`redirect()`](#runtime-redirects--redirect-redirect-routeredirect) throwable is meaningful — it becomes a redirect or a status **on the committed location**, never a React exception:

- A **synchronous** throw lands before the navigation commits: a `redirect()` re-routes the load, a `StatusResponse` commits its status on the location (`location.status`).
- An **async** rejection is honored by guarded late application. The load has already committed (fire-and-forget never blocks render), so the page may render briefly before the redirect or error status lands — that flash is by design, the price of never blocking on data. A rejection arriving while the load is still in flight is held and applied at commit; one arriving after the user has navigated elsewhere (or after the load was superseded) is dropped. The **first** control-flow rejection of a load wins; late redirects re-sync the adapter with replace semantics, so Back does not return to the bounced page.
- On the hover-warm path (`router.warm()` / `Link` hover), a late redirect warms the redirect **target** instead; a late status is folded into the cached entry so the eventual navigation observes it — and applied live if that navigation already consumed the entry.
- **Any other rejection is deliberately ignored** — a failed cache warm must never break navigation.

Errors never reach React error boundaries from `warm`; read `useRoute().status` for error UI. See [Error model](#error-model-errors-are-state) and the [react README's error-handling recipe](../../packages/react/router/README.md#error-handling).

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

A route with no `content`. The `status` is restricted to permanent redirects (`301 | 308`) — distinct from the runtime [`redirect()`](#runtime-redirects--redirect-redirect-routeredirect) helper's wider union. The presence of `redirect` selects the redirect **overload of `route()`** at the type level; at match time a redirect route competes on ordinary path specificity (see [route priority](#url-patterns-and-matching)) and yields a `RedirectRouteMatch` (`kind: "redirect"`, `redirectTo`, `status`) for the server or the loader to follow.

```ts
const legacyHome = route({ url: "/home", redirect: "/", status: 301 });
```

#### Definition shapes and codec

`RouteInput = DataRouteInput | RedirectRouteInput` (what `route()` accepts); `RouteDefinition = DataRouteDefinition | RedirectRouteDefinition` (what it returns). Both definitions extend `RouteCodec<TPath, TParams>`:

```ts
interface RouteCodec<TPath extends string = string, TParams = RouteParams<TPath>> {
  parse(url: string | URL): TParams | null;
  render(params: TParams): string;
}
```

`TParams` is `InferParams<TPath, TParamsSchema>` — the [params schema](#params-validation)'s output when one is declared, otherwise the raw string params inferred from the path. `parse` applies the params schema: a rejected URL returns `null`, exactly like a pattern mismatch. `render` accepts the schema's output values, serializes non-string values with `String()`, and percent-encodes each substituted segment (see [path rendering](#url-patterns-and-matching)).

The definition is the input shape with `wrappers` made required (defaulted to `[]`) plus `parse`/`render`. `DataRouteDefinition` keeps the same three-arg `warm` signature as the input.

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
  readonly warm?: (params: RouteParamValues, context: NavigationContext) => void | Promise<void>;
}

interface WrapperComponentProps<TRendered = unknown> {
  readonly children: TRendered;
}
```

`id` uniqueness is enforced: `createRouter` **throws at construction** when the same id is attached to two different wrapper definitions (sharing one definition across routes is fine — that is the point).

Note the wrapper `warm` takes **two** args `(params, context)` — no `search`, unlike route `warm`. Wrapper warms run for every wrapper on the matched route, are fire-and-forget within a load, and follow the same [control-flow semantics](#the-warm-hook) as route warms. Wrappers are shared across routes, so `params` is always the **raw string params** extracted from the URL (`RouteParamValues`) — a route's [params schema](#params-validation) only transforms what the route's own hooks receive.

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

Applies each middleware to each route, then rebuilds `parse`/`render` from the possibly-changed `url`. **Composition order: the array is reversed and folded, so the first entry is applied last — it is the outermost wrapper.** With `[withI18n, withAuth, withTiming]`, `withTiming` transforms the raw route first (innermost), then `withAuth` wraps that, then `withI18n` wraps everything. Consequently the outermost middleware sees the innermost ones' output, and a hook wrapped by an inner middleware runs inside the outer ones' hooks.

`createRouter` runs this internally over `options.middleware`, so passing `middleware` to the constructor is equivalent; call `applyMiddleware` directly only when manipulating a route array outside a router.

#### Middleware contract (the `withAuth` pattern)

A middleware that guards protected paths wraps the route's existing `warm`, preserving it for the authorized case. Written generically, no cast on the middleware itself is needed:

```ts
export function withAuth(loginPath: string): RouteMiddleware {
  return <TRoute extends AnyRoute>(currentRoute: TRoute): TRoute => {
    if (!protectedPaths.has(currentRoute.url)) {
      return currentRoute;                          // leave unprotected routes untouched
    }

    const currentWarm = currentRoute.warm;          // preserve the original
    const guardedWarm = (params: unknown, search: unknown, context: NavigationContext) => {
      if (!hasDemoAuth(search)) {
        const from = currentRoute.render((params ?? {}) as RouteParamValues | Record<string, never>);
        redirect(`${loginPath}?from=${encodeURIComponent(from)}`, 302);  // throws RouteRedirect
      }
      if (currentWarm) {
        return currentWarm(params, search, context);
      }
    };

    // Overriding `warm` widens the property's type; assert the object back to TRoute.
    return { ...currentRoute, warm: guardedWarm } as TRoute;
  };
}

export const middleware = [withAuth("/login")] as const;
```

Because the guard throws **synchronously** before delegating, the redirect applies before the guarded page commits. A guard that must await something (a session check) still works — the rejection is applied late per the [warm control-flow semantics](#the-warm-hook) — but the page may flash first; when the server can decide, prefer deciding there (see [Entry wiring](#entry-wiring-reference)).

Wire it into both entries:

```ts
createRouter(appRoutes, { adapter: createBrowserAdapter(), middleware: [...middleware], notFound: notFoundRoute });  // client
createRouter(appRoutes, { adapter: createServerAdapter(url), middleware: [...middleware], notFound: notFoundRoute }); // server
```

For a server-side pre-render decision that must not throw, mirror the same logic in a pure helper — and hand it the router's **match**, never the raw URL. A raw-URL check normalizes differently from the router (trailing slashes are ignored by matching, and the last duplicate search value wins), so it could let a protected page render unauthenticated:

```ts
function getAuthRedirectForMatch(match: {
  readonly route: AnyRoute;
  readonly search: unknown;
  readonly pathname: string;
}): string | null {
  if (!protectedPaths.has(match.route.url) || hasDemoAuth(match.search)) {
    return null;
  }
  return `/login?from=${encodeURIComponent(match.pathname)}`;
}
```

The server matches first, then asks (see [Entry wiring](#entry-wiring-reference)).

### Error model: errors are state

The router has two error channels, and neither goes through React error boundaries:

1. **Data errors are state.** Every load commits a result: an unmatched URL commits the `notFound` route with `location.status === 404`; a rejected search schema commits 400; a `StatusResponse`/`Response` thrown from `warm` commits its status; any other throw commits 500. Nothing is thrown into the render tree — read `location.status` (in React: the tracked [`useRoute().status`](#useroute)) and render error UI conditionally.
2. **Render errors belong to React.** A component that throws while rendering is caught by an ordinary React error boundary you place yourself — the router deliberately does not own error UI.

The complete worked recipe (status-driven pages plus a render-error boundary) lives in the [react README](../../packages/react/router/README.md#error-handling).

### Runtime redirects — `redirect`, `Redirect`, `RouteRedirect`

> **`Redirect` is not a React component.** It is the `RouteRedirect` class, re-exported from `@canonical/router-core` under the name `Redirect`. There is no `<Redirect>` element. These are the throwable redirect primitives for `warm`-time control flow.

#### `redirect`

```ts
function redirect(to: string, status: 301 | 302 | 307 | 308 = 302): never;
```

Throws a `RouteRedirect` to short-circuit navigation from inside a route or wrapper `warm` (or middleware wrapping one). Status union is **wider** than static redirect routes (which only allow `301 | 308`); default is `302`.

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

The throwable value `redirect()` constructs. The router follows it internally (up to a redirect depth of 10); on the server, prefer matching first and answering redirects at the HTTP layer (see [Entry wiring](#entry-wiring-reference)).

### `StatusResponse`

```ts
class StatusResponse<TData = unknown> {
  readonly status: number;
  readonly data: TData;
  constructor(status: number, data?: TData);
}
```

A typed non-success status thrown from `warm` (the `data` payload is optional — `new StatusResponse(401)` works). The router commits it as `location.status` per the [error model](#error-model-errors-are-state); it never reaches a React error boundary.

```ts
warm: (params) => {
  if (!canView(params.id)) {
    throw new StatusResponse(403, { id: params.id });
  }
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

`params` validates the path params extracted from the URL. The schema's output type replaces `RouteParams<TPath>` everywhere: `content`'s `params` prop, `warm`'s first argument, `ParamsOf<TRoute>`, and the `params` accepted by `Link`, `navigate`, and `buildPath`.

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
  content: ProductPage,          // ({ params }) — params.id is a number
});

const routes = { product } as const;
const matcher = createRouter(routes);

matcher.buildPath("product", { params: { id: 42 } });   // "/products/42" — typed, serialized with String()
```

This is the mechanism for syntactic constraints — a `(regex)` modifier in the pattern is **not** (it is stripped, never evaluated; see [URL patterns](#url-patterns-and-matching)). For *semantic* validation (does the record exist?), keep using `warm` + [`StatusResponse`](#statusresponse).

#### Search validation

`search` validates the query string. Its output type flows to `content`'s `search` prop and to `SearchOf<TRoute>`.

**Failure semantics: a rejected query string throws `StatusResponse(400, { issues, message })`** (the payload shape is the `SearchValidationFailure` interface). During `load()`/navigation the router catches it and commits an error result — `location.status === 400`, `result.error instanceof StatusResponse` — per the [error model](#error-model-errors-are-state); a server disposition helper that calls `match()` directly must catch it and answer 400. A shared URL with a garbage query is a *bad request*, not a crash — and for that reason, prefer **normalizing** schemas that supply defaults over rejecting ones (`z.coerce.number().catch(1)` rather than `.int()` alone), reserving hard failure for genuinely unrenderable input.

```ts
const accountSearchSchema: StandardSchemaV1<
  Record<string, unknown>,
  { readonly auth?: string }
> = {
  "~standard": {
    version: 1,
    vendor: "app",
    validate(value) {
      const record = value as Record<string, unknown>;
      return { value: { auth: typeof record.auth === "string" ? record.auth : undefined } };
    },
  },
};
```

This schema never fails (it normalizes), which makes it a good dependency-free default. A type-only legacy schema (`output` phantom, no `validate`) passes the raw string record through unvalidated.

### Blocking navigation — `block`

```ts
interface RouterBlockerHandle {
  readonly state: "idle" | "blocked";
  proceed(): void;     // continue the blocked navigation
  cancel(): void;      // discard it and stay
  subscribe(listener: (state: "idle" | "blocked") => void): () => void;
  dispose(): void;     // remove the blocker; a navigation blocked on it is discarded, not resumed
}

router.block(isActive: () => boolean): RouterBlockerHandle;
```

While `isActive()` returns true, `navigate()` is intercepted: the navigation is held, the handle's `state` becomes `"blocked"`, and subscribers are notified. `proceed()` performs the held navigation; `cancel()` discards it. **Scope:** blockers intercept `router.navigate()` only — `setSearchParams()` and adapter-driven back/forward are not intercepted. Disposing while blocked discards the pending navigation.

React consumers use [`useBlocker`](#useblocker), which wraps this handle.

```ts
const blocker = router.block(() => form.isDirty);
const unsubscribe = blocker.subscribe((state) => updateDialog(state));
```

### Platform adapters

```ts
interface PlatformAdapter {
  getLocation(): string | URL;
  navigate(url: string, options?: PlatformNavigateOptions): void;
  subscribe(callback: (location: string | URL) => void): () => void;
  trackLoad?(load: Promise<void>): void; // optional — see below
}

interface PlatformNavigateOptions {
  readonly replace?: boolean;
  readonly state?: unknown;
}
```

**`trackLoad` (optional).** For every adapter-visible navigation (`navigate()`, `setSearchParams()`, and adapter-driven back/forward), the router hands the adapter a promise for the load it just scheduled. The promise settles when the load settles — success or failure — and **never rejects**. Adapters that don't implement it are unaffected; the Navigation API adapter uses it to pass the router's work to `event.intercept({ handler })`, so the browser's native loading UI (spinner, stop button) reflects the in-flight router navigation. The intercept handler never rejects either — a failed load still commits router state (as an error status on the location) and must not mark the browser navigation as failed.

| Adapter | Signature | Notes |
|---|---|---|
| `createBrowserAdapter` | `(): PlatformAdapter` | Navigation API (`window.navigation`) when available, History API otherwise. The default client choice. |
| `createNavigationAdapter` | `(navigationWindow?): PlatformAdapter` | Navigation API only; throws without one. Intercepts same-origin navigations and ties `intercept()`'s handler to the router's tracked load (`trackLoad`), so native loading UI reflects the navigation; transition-promise rejections from superseded navigations are absorbed. |
| `createHistoryAdapter` | `(browserWindow?): PlatformAdapter` | History API (`pushState`/`popstate`). |
| `createHashAdapter` | `(browserWindow?): PlatformAdapter` | Stores the route in `location.hash` (`#/path`). For Storybook, static file hosts, and anywhere the real path is fixed. Throws without a window-like object. |
| `createMemoryAdapter` | `(initialUrl?: string \| URL, options?: MemoryAdapterOptions): MemoryAdapter` | In-memory location for tests; adds `back()`/`forward()`. |
| `createServerAdapter` | `(initialUrl: string \| URL): PlatformAdapter` | Pins one request URL. **Its `navigate()` throws** — a server render never client-navigates — so `router.navigate()`/`setSearchParams()` on a server-adapter router throw too. |

The optional-parameter adapters accept an injectable window-like object for testing.

#### `MemoryAdapterOptions` — delegating location ownership

```ts
interface MemoryAdapterOptions {
  readonly history?: MemoryHistoryDelegate;
}

interface MemoryHistoryDelegate {
  getLocation(): string | URL;                                        // single source of the current location
  onNavigate(url: string, options?: PlatformNavigateOptions): void;   // receives every navigation
  subscribe(listener: (location: string | URL) => void): () => void;  // host announces location changes
  onBack?(): void;                                                    // optional; omitted → back() is a no-op
  onForward?(): void;                                                 // optional; omitted → forward() is a no-op
}
```

With a `history` delegate the adapter owns no location state: the host is the source of truth. The host must apply a forwarded navigation and notify `subscribe` listeners **synchronously inside `onNavigate`** — the router suppresses the echo of its own navigations with a single-slot guard that only holds for a synchronous notification; batched (microtask-later) notifications make router-initiated navigations resolve twice.

```ts
const adapter = createMemoryAdapter("/", { history: hostHistoryDelegate });
```

### Store primitive — `createRouterStore`

The router's reactive state container, exported standalone for hosts that need a router-shaped store without a router. **It is not exposed on `Router`** — subscribe through the router's own `subscribe`/`subscribeToNavigation`/`subscribeToSearchParam`, and read through `getState()`/`getTrackedLocation()`.

```ts
function createRouterStore<TRoutes extends RouteMap, TNotFound extends AnyRoute | undefined = undefined>(
  resolveMatch: (input: string | URL) => RouterMatch<TRoutes, TNotFound> | null,
  initialUrl: string | URL = "/",
): RouterStore<TRoutes, TNotFound>;

interface RouterStore<TRoutes, TNotFound> {
  commit(input: string | URL, match: RouterMatch<TRoutes, TNotFound> | null, status?: number): RouterState<TRoutes, TNotFound>;
  getSnapshot(): RouterSnapshot<TRoutes, TNotFound>;
  getState(): RouterState<TRoutes, TNotFound>;
  getTrackedLocation(onAccess: (key: RouterLocationKey) => void): TrackedLocation<RouterLocationState>;
  setLocation(input: string | URL): RouterState<TRoutes, TNotFound>;
  setNavigationState(state: RouterNavigationState): RouterState<TRoutes, TNotFound>;
  subscribe(listener: (snapshot: RouterSnapshot<TRoutes, TNotFound>) => void): () => void;
  subscribeToNavigation(listener: (state, previousState) => void): () => void;
  subscribeToSearchParam(key: string, listener: (value, previousValue) => void): () => void;
}
```

Subscribers are notified with a changed-key diff over the location (`hash`, `href`, `pathname`, `searchParams`, `status`, `url`), which is what makes the tracked-location proxies re-render only on the fields they read.

### Accessibility

Construction wires four managers (each defaulting on when a `document`/`window` is available, each disableable with `false`):

```ts
interface RouterAccessibilityOptions {
  readonly document?: RouterAccessibilityDocumentLike;
  readonly focusManager?: FocusManagerLike | false;
  readonly getTitle?: (context: RouterAccessibilityContext) => string | null;
  readonly routeAnnouncer?: RouteAnnouncerLike | false;
  readonly scrollManager?: ScrollManagerLike | false;
  readonly viewTransition?: ViewTransitionManagerLike | false;
}

interface RouterAccessibilityContext {
  readonly location: RouterLocationState;
  readonly match: RouterMatch<RouteMap, AnyRoute | undefined> | null;
  readonly status: number;
}
```

The default implementations are exported classes, constructible standalone (each takes a document/window-like object, injectable for tests):

```ts
class FocusManager {           // moves focus after navigation
  constructor(documentLike, options?: { fallbackSelector?: string });  // default "[data-router-outlet]"
  focus(): boolean;
}
class RouteAnnouncer {         // aria-live announcement of the new route
  constructor(documentLike);
  announce(message: string): Promise<void>;
}
class ScrollManager {          // save/restore scroll positions per location
  constructor(windowLike, options?: { document?; sessionStorage?; storageKey?: string });
  save(location: string | URL): void;
  restore(location: string | URL, navigationType: "pop" | "push"): void;
}
class ViewTransitionManager {  // wraps committed updates in document.startViewTransition
  constructor(documentLike);
  run(update: () => void | Promise<void>): Promise<void>;
}
```

`getTitle` sets `document.title` after push/pop navigations from the accessibility context.

### Low-level helpers

```ts
function createSubject<TValue>(): Subject<TValue>;   // { next(value); subscribe(subscriber) → unsubscribe }
function createTrackedLocation<TLocation extends object>(
  location: TLocation,
  onAccess: (key: Extract<keyof TLocation, RouterLocationKey>) => void,
): TrackedLocation<TLocation>;
```

`createTrackedLocation` tracks with property getters defined at construction time, so it only tracks keys present on the given object; the React `useRoute` hook uses a `Proxy` internally instead to also catch dynamic keys.

### Supporting types

| Type | Shape / meaning |
|---|---|
| `RouteMap` | `Record<string, AnyRoute>` |
| `RouterState` | `{ location: RouterLocationState; match: RouterMatch \| null; navigation: { state } }` |
| `RouterLocationState` | `{ hash; href; pathname; searchParams: URLSearchParams; status: number; url: URL }` — `url` is absolute against the synthetic `https://router.local` origin for relative inputs |
| `RouterNavigationState` | `"idle" \| "loading"` |
| `RouterMatch` | union of `DataRouteMatch` (`kind: "route"`, `status: 200`), `RedirectRouteMatch` (`kind: "redirect"`, `redirectTo`, `status`), `NotFoundRouteMatch` (`kind: "not-found"`, `status: 404`) |
| `RouterDehydratedState` | `{ href; kind: "route" \| "not-found" \| "unmatched"; routeId; status }` |
| `RouterLoadResult` | `{ dehydrate(); error; location; match; status }` (returned by `load`/`hydrate`) |
| `RouterBlockerHandle` | the handle returned by [`router.block()`](#blocking-navigation--block) |
| `PathBuildOptions<TRoute>` | `{ params?; search?; hash?; replace? }` — `params` required iff the path has params |
| `NavigationIntent` | `{ name; href; params; search; hash? }` (returned by `navigate`) |
| `TrackedLocation<T>` | a location whose field reads subscribe the reader to just that field |
| `Subject<T>` | `{ next(value); subscribe(subscriber) → unsubscribe }` |
| `PlatformAdapter` / `MemoryAdapter` / `MemoryAdapterOptions` / `MemoryHistoryDelegate` | see [Platform adapters](#platform-adapters) |
| `SchemaLike<TOutput>` | `StandardSchemaV1<unknown, TOutput> \| StandardSchemaLike<TOutput>` — what `params`/`search` accept |
| `InferOutput<TSchema>` | a schema's output type (`types.output` phantom, or legacy `output`) |
| `InferParams<TPath, TParamsSchema>` | params schema output when declared, else `RouteParams<TPath>` |
| `ParamsOf<TRoute>` | the route's params as seen by `content`/`Link`/`navigate` (schema-aware) |
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

A `forwardRef` anchor that builds `href` from a **typed route name**. A primary-button click is intercepted into `router.navigate()`; hover (`onMouseEnter`) calls `router.warm()`; `aria-current="page"` is set when the target matches the current pathname.

**Native fall-through happens only when:** the click was already `defaultPrevented`, the button is not the primary one, a modifier key is held (`ctrl`/`meta`/`shift`/`alt`), `target="_blank"` is set, or `download` is set. **Any other `target` value** (`_self`, `_top`, `_parent`, a named frame) is still intercepted and routed through `router.navigate()` — use a plain `<a>` when you need those to behave natively.

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

The hover warm is fire-and-forget and cached per href; see [`router.warm`](#router) for the cache semantics.

### `Outlet`

```ts
interface OutletProps {
  readonly fallback?: ReactNode;
}

function Outlet({ fallback = null }: OutletProps): ReactElement;
```

Renders the matched route subtree (route content wrapped by its wrappers). Rerenders only when the location `href` or `match` changes — not on `idle → loading` transitions. Output is wrapped in `<Suspense key={routeName} fallback={fallback}>`. Render errors from route content propagate **past** `Outlet`; wrap it in an error boundary to catch them (data errors never throw — see the [error model](#error-model-errors-are-state)).

```tsx
<Outlet fallback={<p>Loading…</p>} />
```

### Hooks

All default their generics to `RegisteredRouteMap` / `RegisteredNotFound` (see [`register`](#register--typed-routing-without-generics)), so once you register your routes no generics are needed. Each subscribes to the narrowest channel it needs.

#### `useRouter`

```ts
function useRouter<TRoutes = RegisteredRouteMap, TNotFound = RegisteredNotFound>(): Router<TRoutes, TNotFound>;
```

The raw router from the nearest provider. Throws if no provider is present. Use for imperative `navigate`/`buildPath`/`warm`/`setSearchParams`/`block`.

```ts
const router = useRouter();
router.navigate("home");
```

#### `useRoute`

```ts
function useRoute<TRoutes = RegisteredRouteMap, TNotFound = RegisteredNotFound>(): TrackedLocation<RouterLocationState>;
```

The current location as a tracked proxy over `RouterLocationState` — the keys are `hash`, `href`, `pathname`, `searchParams`, `status`, and `url`. Reading a field subscribes the component to **only** that field.

`useRoute().status` is the data-error bridge: the router commits every load's HTTP-like status onto the location (200, 404 for not-found, 400 for a rejected search schema, whatever a `warm` hook threw), so status-driven error UI is a conditional render, not an error boundary:

```tsx
const { status } = useRoute();
if (status >= 400) {
  return <ErrorPage status={status} />;
}
```

```ts
const { pathname, searchParams } = useRoute();
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
const routeName = useRouterState((state) =>
  state.match?.kind === "route" ? state.match.name : null,
);
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

Registers a navigation blocker via [`router.block()`](#blocking-navigation--block) while mounted. When a navigation is attempted with `isActive` true, `state` becomes `"blocked"` (the hook re-renders on the block itself); call `proceed()` to continue or `cancel()` to stay. Unmounting while blocked disposes the blocker and **discards** the pending navigation. Blockers cover `navigate()` only — not `setSearchParams()` or browser back/forward.

```tsx
const blocker = useBlocker(form.isDirty);
return blocker.state === "blocked" ? (
  <div role="dialog">
    <button onClick={blocker.proceed}>Leave</button>
    <button onClick={blocker.cancel}>Stay</button>
  </div>
) : null;
```

### `readDehydratedState`

```ts
function readDehydratedState<TRoutes extends RouteMap = RouteMap>(
  browserWindow?: HydrationWindow,   // defaults to window
): RouterDehydratedState<TRoutes> | null;
```

Reads the router's dehydrated SSR state from the page's initial-data payload (`window` key `INITIAL_DATA_KEY` from `@canonical/react-ssr` — the `__INITIAL_DATA__` global). The server flat-spreads `dehydrate()`'s fields (`href`, `kind`, `routeId`, `status`) into that payload; this reader validates their presence and returns `null` when the payload is absent or carries no router fields — so an SPA page (or a payload holding only app data) falls back to a normal initial load instead of a hydration crash.

```ts
const router = createRouter(appRoutes, {
  adapter: createBrowserAdapter(),
  hydratedState: readDehydratedState() ?? undefined,
});
```

This is the client half of SSR hydration; the server half is `renderToStream`'s `bootstrapScriptContent` or the manual flat-spread shown in [Entry wiring](#entry-wiring-reference). There is exactly one payload channel — `INITIAL_DATA_KEY` — shared with the rest of the app's initial data.

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

SSR helper. Calls `router.load(url)`, then `renderToReadableStream` of `<RouterProvider><Outlet/></RouterProvider>`. Returns the stream plus dehydrated state and a bootstrap script for client hydration (pairs with [`readDehydratedState`](#readdehydratedstate)).

```ts
const { stream, bootstrapScriptContent, loadResult } = await renderToStream(router, requestUrl);
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

The reference app (`apps/react/boilerplate-vite`) wires the full pattern; the summon templates scaffold the same shape.

**Server — answer with the router's disposition first.** A module-scope **adapterless** router is a pure matcher (construction runs no load and no `warm` hooks; never use a server-adapter router here — it warms at construction). Resolve every request to a redirect or a render + status before touching React:

```ts
const dispositionMatcher = createRouter(appRoutes, {
  middleware: [...middleware],
  notFound: notFoundRoute,
});

export function resolveRouteDisposition(url: string): RouteDisposition {
  let matchResult: ReturnType<typeof dispositionMatcher.match>;
  try {
    matchResult = dispositionMatcher.match(url);
  } catch (error) {
    // A rejected search schema is a client error, not a crash.
    return {
      kind: "render",
      status: error instanceof StatusResponse ? error.status : 500,
      dehydratedState: null,
    };
  }

  if (matchResult?.kind === "redirect") {
    return { kind: "redirect", status: matchResult.status, location: matchResult.redirectTo };
  }

  // Auth is decided AFTER matching, from the router's own data — the matched
  // pattern and the schema-validated search — so the server can never
  // normalize differently from the router.
  const authRedirect =
    matchResult?.kind === "route" ? getAuthRedirectForMatch(matchResult) : null;
  if (authRedirect) {
    return { kind: "redirect", status: 302, location: authRedirect };
  }

  const status = matchResult?.status ?? 404;
  return {
    kind: "render",
    status,
    dehydratedState: {
      href: url,
      kind: matchResult?.kind === "route" ? "route" : "not-found",
      routeId: matchResult?.kind === "route" ? String(matchResult.name) : null,
      status,
    },
  };
}
```

The HTTP layer answers `redirect` dispositions directly (a 301 for a static redirect route, the auth guard's 302) and passes a `render` disposition's `status` to the response (via `@canonical/react-ssr`'s `RendererOptions.statusCode`) — a matched not-found page is a real 404, never a soft 200. The `dehydratedState` fields are flat-spread into the page's `__INITIAL_DATA__` payload next to the app's own initial data.

**Server — render the request.** The server entry builds a per-request router pinned to the URL and hydrates it synchronously so `render()`/`<Outlet>` work without awaiting `load()`:

```tsx
const router = createRouter(appRoutes, {
  middleware: [...middleware],
  notFound: notFoundRoute,
  adapter: createServerAdapter(url),
});
const serverMatch = router.match(url);

if (serverMatch?.kind === "route" || serverMatch?.kind === "not-found") {
  router.hydrate({
    href: url,
    kind: serverMatch.kind,
    routeId: serverMatch.kind === "route" ? serverMatch.name : null,
    status: serverMatch.status,
  });
}

<RouterProvider router={router}>
  <Outlet fallback={<p>Loading…</p>} />
</RouterProvider>;
```

(Alternatively, `renderToStream(router, url)` performs load + stream + payload in one call.)

**Client — resume from the payload:**

```tsx
const router = createRouter(appRoutes, {
  adapter: createBrowserAdapter(),
  middleware: [...middleware],
  notFound: notFoundRoute,
  hydratedState: readDehydratedState() ?? undefined,   // null on SPA pages → normal initial load
});

hydrateRoot(
  document.getElementById("root")!,
  <RouterProvider router={router}>
    <Outlet fallback={<p>Loading…</p>} />
  </RouterProvider>,
);
```

On SSR pages the router resumes the server-rendered match and skips the duplicate initial load; in SPA cells `readDehydratedState()` returns `null` and a normal load runs.

---

## See also

- [Migrating to the pragma router](../how-to-guides/MIGRATE_TO_PRAGMA_ROUTER.md)
- [Router middleware cookbook](../how-to-guides/ROUTER_MIDDLEWARE_COOKBOOK.md)
- Design rationale and stability: [core README](../../packages/runtime/router/README.md), [react README](../../packages/react/router/README.md)
- Router core package: `packages/runtime/router`
- Router React package: `packages/react/router`
- Reference app: `apps/react/boilerplate-vite`
