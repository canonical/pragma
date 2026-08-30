/**
 * A single validation issue, as defined by the Standard Schema spec: a
 * human-readable message and an optional path locating the failing value.
 */
export interface StandardSchemaIssue {
  readonly message: string;
  readonly path?:
    | ReadonlyArray<PropertyKey | { readonly key: PropertyKey }>
    | undefined;
}

/** The result union a Standard Schema v1 `validate` call resolves to. */
export type StandardSchemaResult<TOutput = unknown> =
  | { readonly value: TOutput; readonly issues?: undefined }
  | { readonly issues: ReadonlyArray<StandardSchemaIssue> };

/**
 * A Standard Schema v1 validator (https://standardschema.dev).
 *
 * Zod (≥3.24), Valibot, and ArkType all implement this interface, so their
 * schemas can be passed directly to a route's `params`/`search` fields.
 * The router matches synchronously: validators that resolve to a `Promise`
 * are rejected at match time.
 */
export interface StandardSchemaV1<TInput = unknown, TOutput = TInput> {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (
      value: unknown,
    ) => StandardSchemaResult<TOutput> | Promise<StandardSchemaResult<TOutput>>;
    readonly types?:
      | { readonly input: TInput; readonly output: TOutput }
      | undefined;
  };
}

/**
 * Infer a Standard Schema's output type — the type its `validate` resolves
 * to on success.
 *
 * Resolves to `unknown` when the output is unknowable (for example a value
 * widened to the bare {@link StandardSchemaV1} constraint). Each consumer
 * chooses its own fallback for that case: {@link InferParams} falls back to
 * the path-derived params, {@link InferSearch} to a readonly record.
 */
export type InferOutput<TSchema> =
  TSchema extends StandardSchemaV1<unknown, infer TOutput> ? TOutput : unknown;

/**
 * Infer a Standard Schema's input type — the type its `validate` accepts.
 *
 * Resolves to `unknown` when the input is unknowable (a schema declaring
 * no `types` phantom, or a value widened to the bare {@link StandardSchemaV1}
 * constraint).
 */
type InferInput<TSchema> =
  TSchema extends StandardSchemaV1<infer TInput, unknown> ? TInput : unknown;

export type BivariantCallback<TArgs extends readonly unknown[], TResult> = {
  bivarianceHack(...args: TArgs): TResult;
}["bivarianceHack"];

/** The `:param` names of a path pattern, as a union of string literals. */
export type ParamNames<TPath extends string> =
  TPath extends `${string}:${infer TParam}/${infer TRest}`
    ? TParam | ParamNames<`/${TRest}`>
    : TPath extends `${string}:${infer TParam}`
      ? TParam
      : never;

export type RouteParams<TPath extends string> = [ParamNames<TPath>] extends [
  never,
]
  ? Record<string, never>
  : {
      readonly [TKey in ParamNames<TPath>]: string;
    };

export type RouteParamValues = Readonly<Record<string, string>>;

/**
 * The search values a route's `content`/`warm` receive: the search schema's
 * output when one is declared, `Record<string, never>` when the route has
 * no search schema, and a readonly record when the schema's output is
 * unknowable (for example a value widened to the bare schema constraint).
 */
export type InferSearch<TSchema> = [Exclude<TSchema, undefined>] extends [never]
  ? Record<string, never>
  : unknown extends InferOutput<Exclude<TSchema, undefined>>
    ? Readonly<Record<string, unknown>>
    : InferOutput<Exclude<TSchema, undefined>>;

/**
 * The params a route's `content`/`warm` receive: the params schema's
 * output when one is declared, otherwise the raw string params inferred
 * from the path pattern.
 */
export type InferParams<TPath extends string, TParamsSchema> = [
  Exclude<TParamsSchema, undefined>,
] extends [never]
  ? RouteParams<TPath>
  : [Exclude<TParamsSchema, undefined>] extends [StandardSchemaV1]
    ? unknown extends InferOutput<Exclude<TParamsSchema, undefined>>
      ? // The schema's output is unknowable (e.g. a value widened to the
        // bare schema constraint) — fall back to the path-derived params.
        RouteParams<TPath>
      : InferOutput<Exclude<TParamsSchema, undefined>>
    : RouteParams<TPath>;

export interface NavigationContext {
  readonly signal: AbortSignal;
}

export type RouteModule = object;

export interface RouteContentProps<
  TParams = Record<string, never>,
  TSearch = Record<string, never>,
> {
  readonly params: TParams;
  readonly search: TSearch;
}

export interface WrapperComponentProps<TRendered = unknown> {
  readonly children: TRendered;
}

export interface WrapperDefinition<TRendered = unknown> {
  readonly id: string;
  readonly component: BivariantCallback<
    [props: WrapperComponentProps<TRendered>],
    TRendered
  >;
  readonly warm?: BivariantCallback<
    [params: RouteParamValues, context: NavigationContext],
    void | Promise<void>
  >;
}

export interface RouteCodec<
  TPath extends string = string,
  TParams = RouteParams<TPath>,
> {
  parse(url: string | URL): TParams | null;
  render(params: TParams): string;
}

export type AnyWrapper = WrapperDefinition<unknown>;

export type RouteContent<
  TPath extends string = string,
  TSearchSchema extends StandardSchemaV1 | undefined = undefined,
  TRendered = unknown,
  TParamsSchema extends StandardSchemaV1 | undefined = undefined,
> = BivariantCallback<
  [
    props: RouteContentProps<
      InferParams<TPath, TParamsSchema>,
      InferSearch<TSearchSchema>
    >,
  ],
  TRendered
> & {
  preload?: () => Promise<RouteModule>;
};

export type AnyRouteContent = BivariantCallback<
  [props: RouteContentProps<Readonly<Record<string, unknown>>, unknown>],
  unknown
> & {
  preload?: () => Promise<RouteModule>;
};

export interface DataRouteInput<
  TPath extends string = string,
  TSearchSchema extends StandardSchemaV1 | undefined = undefined,
  TRendered = unknown,
  TWrappers extends readonly AnyWrapper[] = readonly [],
  TParamsSchema extends StandardSchemaV1 | undefined = undefined,
> {
  readonly url: TPath;
  readonly content: RouteContent<
    TPath,
    TSearchSchema,
    TRendered,
    TParamsSchema
  >;
  readonly warm?: BivariantCallback<
    [
      params: InferParams<TPath, TParamsSchema>,
      search: InferSearch<TSearchSchema>,
      context: NavigationContext,
    ],
    void | Promise<void>
  >;
  readonly params?: TParamsSchema;
  readonly search?: TSearchSchema;
  readonly wrappers?: TWrappers;
  readonly meta?: Readonly<Record<string, unknown>>;
}

export type StaticRedirectStatus = 301 | 308;

export interface RedirectRouteInput<
  TPath extends string = string,
  TTarget extends string = string,
  TWrappers extends readonly AnyWrapper[] = readonly [],
  TParamsSchema extends StandardSchemaV1 | undefined = undefined,
> {
  readonly url: TPath;
  readonly redirect: TTarget;
  readonly status: StaticRedirectStatus;
  readonly params?: TParamsSchema;
  readonly wrappers?: TWrappers;
  readonly meta?: Readonly<Record<string, unknown>>;
}

export type RouteInput<
  TPath extends string = string,
  TSearchSchema extends StandardSchemaV1 | undefined = undefined,
  TRendered = unknown,
  TWrappers extends readonly AnyWrapper[] = readonly [],
  TParamsSchema extends StandardSchemaV1 | undefined = undefined,
> =
  | DataRouteInput<TPath, TSearchSchema, TRendered, TWrappers, TParamsSchema>
  | RedirectRouteInput<TPath, string, TWrappers, TParamsSchema>;

export interface DataRouteDefinition<
  TPath extends string = string,
  TSearchSchema extends StandardSchemaV1 | undefined = undefined,
  TRendered = unknown,
  TWrappers extends readonly AnyWrapper[] = readonly [],
  TParamsSchema extends StandardSchemaV1 | undefined = undefined,
> extends RouteCodec<TPath, InferParams<TPath, TParamsSchema>> {
  readonly url: TPath;
  readonly content: RouteContent<
    TPath,
    TSearchSchema,
    TRendered,
    TParamsSchema
  >;
  readonly warm?: BivariantCallback<
    [
      params: InferParams<TPath, TParamsSchema>,
      search: InferSearch<TSearchSchema>,
      context: NavigationContext,
    ],
    void | Promise<void>
  >;
  readonly params?: TParamsSchema;
  readonly search?: TSearchSchema;
  readonly wrappers: TWrappers;
  readonly meta?: Readonly<Record<string, unknown>>;
}

export interface RedirectRouteDefinition<
  TPath extends string = string,
  TTarget extends string = string,
  TWrappers extends readonly AnyWrapper[] = readonly [],
  TParamsSchema extends StandardSchemaV1 | undefined = undefined,
> extends RouteCodec<TPath, InferParams<TPath, TParamsSchema>> {
  readonly url: TPath;
  readonly redirect: TTarget;
  readonly status: StaticRedirectStatus;
  readonly params?: TParamsSchema;
  readonly wrappers: TWrappers;
  readonly meta?: Readonly<Record<string, unknown>>;
}

export type RouteDefinition<
  TPath extends string = string,
  TSearchSchema extends StandardSchemaV1 | undefined = undefined,
  TRendered = unknown,
  TWrappers extends readonly AnyWrapper[] = readonly [],
  TParamsSchema extends StandardSchemaV1 | undefined = undefined,
> =
  | DataRouteDefinition<
      TPath,
      TSearchSchema,
      TRendered,
      TWrappers,
      TParamsSchema
    >
  | RedirectRouteDefinition<TPath, string, TWrappers, TParamsSchema>;

export interface AnyRoute {
  readonly url: string;
  readonly content?: AnyRouteContent;
  readonly warm?: BivariantCallback<
    [params: unknown, search: unknown, context: NavigationContext],
    void | Promise<void>
  >;
  readonly params?: StandardSchemaV1;
  readonly search?: StandardSchemaV1;
  readonly redirect?: string;
  readonly status?: number;
  readonly wrappers: readonly AnyWrapper[];
  readonly meta?: Readonly<Record<string, unknown>>;
  parse(url: string | URL): Readonly<Record<string, unknown>> | null;
  render(params: Readonly<Record<string, unknown>>): string;
}

export type PrependWrapper<
  TWrapper extends AnyWrapper,
  TRoute extends AnyRoute,
> = Omit<TRoute, "wrappers"> & {
  readonly wrappers: readonly [TWrapper, ...TRoute["wrappers"]];
};

export type GroupedRoutes<
  TWrapper extends AnyWrapper,
  TRoutes extends readonly AnyRoute[],
> = {
  readonly [TIndex in keyof TRoutes]: TRoutes[TIndex] extends AnyRoute
    ? PrependWrapper<TWrapper, TRoutes[TIndex]>
    : never;
};

export type RouteMiddleware = <TRoute extends AnyRoute>(
  route: TRoute,
) => TRoute;

export type RouteMap = Record<string, AnyRoute>;

export type RouteName<TRoutes extends RouteMap> = Extract<
  keyof TRoutes,
  string
>;

export type RouteOf<
  TRoutes extends RouteMap,
  TName extends RouteName<TRoutes>,
> = TRoutes[TName];

export type RouteArgs<
  TRoutes extends RouteMap,
  TName extends RouteName<TRoutes>,
> =
  RouteOf<TRoutes, TName> extends infer TRoute extends AnyRoute
    ? PathBuildArgs<TRoute>
    : never;

export type RouteIntent<
  TRoutes extends RouteMap,
  TName extends RouteName<TRoutes>,
> =
  RouteOf<TRoutes, TName> extends infer TRoute extends AnyRoute
    ? NavigationIntent<TName, TRoute>
    : never;

export type ParamsOf<TRoute extends AnyRoute> = TRoute extends {
  readonly url: infer TPath extends string;
  readonly params?: infer TParamsSchema;
}
  ? InferParams<TPath, TParamsSchema>
  : Record<string, never>;

/**
 * The validated search values a matched route carries: the search schema's
 * output, `Record<string, never>` for a route with no search schema, and a
 * readonly record when the output is unknowable.
 */
export type SearchOf<TRoute extends AnyRoute> = TRoute extends {
  readonly search?: infer TSearchSchema;
}
  ? InferSearch<TSearchSchema>
  : Record<string, never>;

/**
 * The search values accepted when building a path for a route: the search
 * schema's *input* type, because build values pass through the schema's
 * serialization boundary in the other direction from matching. Falls back
 * exactly as {@link SearchOf} does — `Record<string, never>` without a
 * schema, a readonly record when the input is unknowable.
 */
export type SearchInputOf<TRoute extends AnyRoute> = TRoute extends {
  readonly search?: infer TSearchSchema;
}
  ? [Exclude<TSearchSchema, undefined>] extends [never]
    ? Record<string, never>
    : unknown extends InferInput<Exclude<TSearchSchema, undefined>>
      ? Readonly<Record<string, unknown>>
      : InferInput<Exclude<TSearchSchema, undefined>>
  : Record<string, never>;

export type HasParams<TRoute extends AnyRoute> = TRoute extends {
  readonly url: infer TPath extends string;
}
  ? ParamNames<TPath> extends never
    ? false
    : true
  : false;

/** The value shapes `buildSearch`/`renderPattern` can serialize. */
type SerializableScalar = string | number | boolean;

/**
 * Check that every search value can serialize into a query string: a
 * scalar, or an array of scalars (`undefined` items are skipped by the
 * serializer, so arrays admit them). A homomorphic mapped type, so the
 * checked object keeps excess-property checking, optionality, and
 * modifiers; a field that cannot serialize is replaced by a string-literal
 * type stating the error, so the offending value surfaces as a mismatch
 * against that message.
 */
type SerializableSearch<TSearch> = {
  [TKey in keyof TSearch]: unknown extends TSearch[TKey]
    ? TSearch[TKey]
    : TSearch[TKey] extends
          | SerializableScalar
          | ReadonlyArray<SerializableScalar | undefined>
          | undefined
      ? TSearch[TKey]
      : `search value '${TKey & string}' cannot serialize into a query string; use a string, number, boolean, or an array of those`;
};

/**
 * Check that every param value can render into a single path segment: a
 * scalar only — no arrays (a param renders into one segment) and no
 * `undefined` (rendering throws on a nullish param). A homomorphic mapped
 * type; a field that cannot render is replaced by a string-literal type
 * stating the error.
 */
type SerializableParams<TParams> = {
  [TKey in keyof TParams]: unknown extends TParams[TKey]
    ? TParams[TKey]
    : TParams[TKey] extends SerializableScalar
      ? TParams[TKey]
      : `params value '${TKey & string}' cannot render into a path segment; use a string, number, or boolean`;
};

export type PathBuildOptions<TRoute extends AnyRoute> = {
  readonly search?: NoInfer<SerializableSearch<SearchInputOf<TRoute>>>;
  readonly hash?: string;
  /** When true, the navigation replaces the current history entry. */
  readonly replace?: boolean;
} & (HasParams<TRoute> extends true
  ? { readonly params: NoInfer<SerializableParams<ParamsOf<TRoute>>> }
  : { readonly params?: NoInfer<SerializableParams<ParamsOf<TRoute>>> });

export type PathBuildArgs<TRoute extends AnyRoute> =
  HasParams<TRoute> extends true
    ? [options: PathBuildOptions<TRoute>]
    : [options?: PathBuildOptions<TRoute>];

/**
 * The intent returned by `navigate()`/`buildPath()`: the build values are
 * carried verbatim, so `params` holds schema-output values and `search`
 * holds schema-*input* values — build search has not passed through the
 * schema.
 */
export interface NavigationIntent<
  TName extends string,
  TRoute extends AnyRoute,
> {
  readonly name: TName;
  readonly href: string;
  readonly params: ParamsOf<TRoute>;
  readonly search: SearchInputOf<TRoute>;
  readonly hash?: string;
}

export interface RouteMatchBase<TRoute extends AnyRoute> {
  readonly route: TRoute;
  readonly params: ParamsOf<TRoute>;
  readonly search: SearchOf<TRoute>;
  readonly pathname: string;
  readonly url: URL;
}

export interface DataRouteMatch<TName extends string, TRoute extends AnyRoute>
  extends RouteMatchBase<TRoute> {
  readonly kind: "route";
  readonly name: TName;
  readonly status: 200;
}

export interface RedirectRouteMatch<
  TName extends string,
  TRoute extends RedirectRouteDefinition,
> extends RouteMatchBase<TRoute> {
  readonly kind: "redirect";
  readonly name: TName;
  readonly redirectTo: string;
  readonly status: TRoute["status"];
}

export interface NotFoundRouteMatch<TRoute extends AnyRoute>
  extends RouteMatchBase<TRoute> {
  readonly kind: "not-found";
  readonly name: null;
  readonly status: 404;
}

export type RouterNavigationState = "idle" | "loading";

export interface RouterLocationState {
  readonly hash: string;
  readonly href: string;
  readonly pathname: string;
  readonly searchParams: URLSearchParams;
  readonly status: number;
  readonly url: URL;
}

export type RouterLocationKey = keyof RouterLocationState;

export type TrackedLocation<TLocation extends object> = {
  readonly [TKey in keyof TLocation]: TLocation[TKey];
};

export interface SubjectObserver<TValue> {
  next(value: TValue): void;
}

export type SubjectSubscriber<TValue> =
  | SubjectObserver<TValue>
  | ((value: TValue) => void);

export interface Subject<TValue> {
  next(value: TValue): void;
  subscribe(subscriber: SubjectSubscriber<TValue>): () => void;
}

export type NamedRouteMatch<
  TRoutes extends RouteMap,
  TName extends RouteName<TRoutes>,
> =
  RouteOf<TRoutes, TName> extends infer TRoute extends AnyRoute
    ? TRoute extends RedirectRouteDefinition
      ? RedirectRouteMatch<TName, TRoute>
      : DataRouteMatch<TName, TRoute>
    : never;

export type RouterMatch<
  TRoutes extends RouteMap,
  TNotFound extends AnyRoute | undefined = undefined,
> =
  | {
      [TName in RouteName<TRoutes>]: NamedRouteMatch<TRoutes, TName>;
    }[RouteName<TRoutes>]
  | (TNotFound extends AnyRoute ? NotFoundRouteMatch<TNotFound> : never);

export interface RouterState<
  TRoutes extends RouteMap,
  TNotFound extends AnyRoute | undefined = undefined,
> {
  readonly location: RouterLocationState;
  readonly match: RouterMatch<TRoutes, TNotFound> | null;
  readonly navigation: {
    readonly state: RouterNavigationState;
  };
}

export interface RouterSnapshot<
  TRoutes extends RouteMap,
  TNotFound extends AnyRoute | undefined = undefined,
> extends RouterLocationState {
  readonly match: RouterMatch<TRoutes, TNotFound> | null;
  readonly navigationState: RouterNavigationState;
}

export interface SearchParamChange<
  TRoutes extends RouteMap,
  TNotFound extends AnyRoute | undefined = undefined,
> {
  readonly key: string;
  readonly location: RouterLocationState;
  readonly match: RouterMatch<TRoutes, TNotFound> | null;
  readonly previousValue: string | null;
  readonly value: string | null;
}

export interface RouterLocationChange<
  TRoutes extends RouteMap,
  TNotFound extends AnyRoute | undefined = undefined,
> {
  readonly changed: readonly RouterLocationKey[];
  readonly location: RouterLocationState;
  readonly match: RouterMatch<TRoutes, TNotFound> | null;
}

export interface NavigationStateChange<
  TRoutes extends RouteMap,
  TNotFound extends AnyRoute | undefined = undefined,
> {
  readonly current: RouterState<TRoutes, TNotFound>;
  readonly previousState: RouterNavigationState;
  readonly state: RouterNavigationState;
}

/**
 * The search keys one route declares, or `never` when its search type is
 * an index signature (no schema, or an unknowable one) — guarded so a
 * single schema-less route cannot widen a router's key union to `string`.
 */
type SearchKeys<TRoute extends AnyRoute> = string extends keyof SearchOf<TRoute>
  ? never
  : Extract<keyof SearchOf<TRoute>, string>;

/** The union of every search key declared by a route map's schemas. */
type DeclaredSearchKeys<TRoutes extends RouteMap> = {
  [TName in RouteName<TRoutes>]: SearchKeys<RouteOf<TRoutes, TName>>;
}[RouteName<TRoutes>];

/**
 * The search-param keys a router can set and observe: the union of every
 * key declared by a route's search schema. When no route declares a search
 * schema the union falls back to `string`, because live URLs still carry
 * undeclared params.
 */
export type SearchParamKey<TRoutes extends RouteMap> = [
  DeclaredSearchKeys<TRoutes>,
] extends [never]
  ? string
  : DeclaredSearchKeys<TRoutes>;

/**
 * A `setSearchParams` update: declared keys only, each optional, `null`
 * meaning "remove this param".
 */
type SearchParamUpdate<TRoutes extends RouteMap> = {
  readonly [TKey in SearchParamKey<TRoutes>]?: string | null;
};

export interface RouterStore<
  TRoutes extends RouteMap,
  TNotFound extends AnyRoute | undefined = undefined,
> {
  commit(
    input: string | URL,
    match: RouterMatch<TRoutes, TNotFound> | null,
    status?: number,
  ): RouterState<TRoutes, TNotFound>;
  getSnapshot(): RouterSnapshot<TRoutes, TNotFound>;
  getState(): RouterState<TRoutes, TNotFound>;
  getTrackedLocation(
    onAccess: (key: RouterLocationKey) => void,
  ): TrackedLocation<RouterLocationState>;
  setLocation(input: string | URL): RouterState<TRoutes, TNotFound>;
  setNavigationState(
    state: RouterNavigationState,
  ): RouterState<TRoutes, TNotFound>;
  subscribe(
    listener: (snapshot: RouterSnapshot<TRoutes, TNotFound>) => void,
  ): () => void;
  subscribeToNavigation(
    listener: (
      state: RouterNavigationState,
      previousState: RouterNavigationState,
    ) => void,
  ): () => void;
  subscribeToSearchParam(
    key: SearchParamKey<TRoutes>,
    listener: (value: string | null, previousValue: string | null) => void,
  ): () => void;
}

/** Handle returned by `router.block()` controlling one navigation blocker. */
export interface RouterBlockerHandle {
  /** `"blocked"` while a navigation is intercepted and awaiting a decision. */
  readonly state: "idle" | "blocked";
  /** Continue the blocked navigation. */
  proceed(): void;
  /** Discard the blocked navigation and stay on the current page. */
  cancel(): void;
  /** Subscribe to blocked/idle transitions. */
  subscribe(listener: (state: "idle" | "blocked") => void): () => void;
  /**
   * Remove the blocker. A navigation currently blocked on it is discarded,
   * not resumed.
   */
  dispose(): void;
}

export interface PlatformNavigateOptions {
  readonly replace?: boolean;
  readonly state?: unknown;
}

export interface PlatformAdapter {
  getLocation(): string | URL;
  navigate(url: string, options?: PlatformNavigateOptions): void;
  subscribe(callback: (location: string | URL) => void): () => void;
  /**
   * Optional: receive the in-flight load the router scheduled for the most
   * recent adapter-visible navigation, so platform loading UI can await it
   * (the Navigation API adapter passes it to `event.intercept()`). The
   * promise settles when the load settles and never rejects.
   */
  trackLoad?(load: Promise<void>): void;
}

export interface MemoryAdapter extends PlatformAdapter {
  back(): void;
  forward(): void;
  /**
   * Always a fresh `URL`: the memory adapter normalizes every location at
   * its boundary, so callers can read `pathname`/`search` directly.
   */
  getLocation(): URL;
}

/**
 * A host-supplied source of location state for the memory adapter.
 *
 * When a delegate is provided, the adapter owns no location state of its own:
 * `getLocation` reads the delegate, `onNavigate` receives every navigation, and
 * `subscribe` is the seam through which the host announces location changes.
 * `onBack` and `onForward` are optional history hooks---omit them and the
 * adapter's `back`/`forward` become no-ops, because a host that owns location
 * owns its own history model.
 */
export interface MemoryHistoryDelegate {
  /** The single source of the current location. */
  getLocation(): string | URL;
  /**
   * Receives every navigation the adapter is asked to perform.
   *
   * The host must apply the navigation and notify `subscribe` listeners
   * synchronously, before `onNavigate` returns. The router core suppresses the
   * echo of its own navigations through a single-slot guard that only holds
   * for a synchronous notification; a host that batches notifications
   * (microtask or later) will cause router-initiated navigations to resolve
   * twice. An error thrown here propagates to the `navigate` caller.
   */
  onNavigate(url: string, options?: PlatformNavigateOptions): void;
  /**
   * The seam through which the host announces location changes. Must fire
   * synchronously within `onNavigate` for navigations the adapter forwarded;
   * see `onNavigate` for why.
   */
  subscribe(listener: (location: string | URL) => void): () => void;
  onBack?(): void;
  onForward?(): void;
}

export interface MemoryAdapterOptions {
  readonly history?: MemoryHistoryDelegate;
}

/**
 * The serializable snapshot `dehydrate()` emits and `hydrate()` consumes.
 *
 * Deliberately one flat shape rather than a union discriminated on `kind`
 * (considered and declined): the fields are identical across the three
 * kinds, and `hydrate()` re-validates `kind` and `routeId` against the
 * live match at runtime and throws on mismatch, so a discriminated union
 * would add three type names without adding a check.
 */
export interface RouterDehydratedState<TRoutes extends RouteMap = RouteMap> {
  readonly href: string;
  readonly kind: "route" | "not-found" | "unmatched";
  readonly routeId: RouteName<TRoutes> | null;
  readonly status: number;
}

export interface RouterLoadResult<
  TRoutes extends RouteMap,
  TNotFound extends AnyRoute | undefined = undefined,
> {
  dehydrate(): RouterDehydratedState<TRoutes>;
  readonly error: unknown;
  readonly location: RouterLocationState;
  readonly match: RouterMatch<TRoutes, TNotFound> | null;
  readonly status: number;
}

/**
 * Options accepted by `createRouter()`.
 *
 * Deliberately not generic over the route map (considered and declined):
 * the only field a `TRoutes` parameter could narrow is
 * `hydratedState.routeId`, a serialized string that `hydrate()` already
 * re-validates against the live match at runtime, so the extra generic
 * would thread through every consumer without adding a check.
 */
export interface RouterOptions<
  TNotFound extends AnyRoute | undefined = undefined,
> {
  readonly adapter?: PlatformAdapter;
  readonly accessibility?: RouterAccessibilityOptions;
  readonly hydratedState?: RouterDehydratedState<RouteMap>;
  readonly initialUrl?: string | URL;
  readonly middleware?: readonly RouteMiddleware[];
  readonly notFound?: TNotFound;
}

export interface RouterAccessibilityContext {
  readonly location: RouterLocationState;
  readonly match: RouterMatch<RouteMap, AnyRoute | undefined> | null;
  readonly status: number;
}

export interface FocusManagerLike {
  focus(): boolean;
}

export interface RouteAnnouncerLike {
  announce(message: string): Promise<void> | void;
}

export interface ScrollManagerLike {
  restore(location: string | URL, navigationType: "pop" | "push"): void;
  save(location: string | URL): void;
}

export interface ViewTransitionManagerLike {
  run(update: () => void | Promise<void>): Promise<void>;
}

export interface RouterAccessibilityDocumentLike {
  title: string;
  querySelector(selector: string): { textContent?: string | null } | null;
}

export interface RouterAccessibilityOptions {
  readonly document?: RouterAccessibilityDocumentLike;
  readonly focusManager?: FocusManagerLike | false;
  readonly getTitle?: (context: RouterAccessibilityContext) => string | null;
  readonly routeAnnouncer?: RouteAnnouncerLike | false;
  readonly scrollManager?: ScrollManagerLike | false;
  readonly viewTransition?: ViewTransitionManagerLike | false;
}

export interface Router<
  TRoutes extends RouteMap,
  TNotFound extends AnyRoute | undefined = undefined,
> {
  readonly routes: TRoutes;
  readonly notFound: TNotFound;
  readonly adapter: PlatformAdapter | null;
  getRoute<TName extends RouteName<TRoutes>>(
    name: TName,
  ): RouteOf<TRoutes, TName>;
  getState(): RouterState<TRoutes, TNotFound>;
  getTrackedLocation(
    onAccess: (key: RouterLocationKey) => void,
  ): TrackedLocation<RouterLocationState>;
  /**
   * Build the href for a named route from its typed params and search.
   *
   * A single generic signature, not one overload per route: when `name` is
   * a union of route names mixing params and paramless routes, the
   * conditional args tuple widens to its optional branch, so a missing
   * `params` for the union is not caught — pass a single literal name for
   * full checking.
   */
  buildPath<TName extends RouteName<TRoutes>>(
    name: TName,
    ...args: RouteArgs<TRoutes, TName>
  ): string;
  dehydrate(): RouterDehydratedState<TRoutes> | null;
  dispose(): void;
  hydrate(
    state: RouterDehydratedState<TRoutes>,
  ): RouterLoadResult<TRoutes, TNotFound>;
  load(url: string | URL): Promise<RouterLoadResult<TRoutes, TNotFound>>;
  match(url: string | URL): RouterMatch<TRoutes, TNotFound> | null;
  /**
   * Navigate to a named route, returning the built navigation intent.
   * Shares `buildPath`'s single-generic-signature checking limit for a
   * union of route names.
   */
  navigate<TName extends RouteName<TRoutes>>(
    name: TName,
    ...args: RouteArgs<TRoutes, TName>
  ): RouteIntent<TRoutes, TName>;
  /**
   * Preload a named route: run its wrapper and route warm hooks and cache
   * the load. Shares `buildPath`'s single-generic-signature checking limit
   * for a union of route names.
   */
  warm<TName extends RouteName<TRoutes>>(
    name: TName,
    ...args: RouteArgs<TRoutes, TName>
  ): Promise<void>;
  /**
   * Register a navigation blocker. While `isActive()` returns true,
   * `navigate()` is intercepted and held until the returned handle's
   * `proceed()` or `cancel()` decides it. Blockers cover `navigate()` only —
   * `setSearchParams()` and adapter-driven back/forward are not intercepted.
   */
  block(isActive: () => boolean): RouterBlockerHandle;
  render(result?: RouterLoadResult<TRoutes, TNotFound> | null): unknown;
  /**
   * Merge an update into the current search params and navigate. Keys are
   * limited to those the route map's search schemas declare; the callback
   * still receives every live param, because URLs carry undeclared ones.
   * `null` (or `undefined`) removes a param.
   */
  setSearchParams(
    params:
      | SearchParamUpdate<TRoutes>
      | ((
          current: Readonly<Record<string, string>>,
        ) => SearchParamUpdate<TRoutes>),
    options?: { readonly replace?: boolean },
  ): void;
  subscribe(
    listener: (snapshot: RouterSnapshot<TRoutes, TNotFound>) => void,
  ): () => void;
  subscribeToNavigation(
    listener: (
      state: RouterNavigationState,
      previousState: RouterNavigationState,
    ) => void,
  ): () => void;
  subscribeToSearchParam(
    key: SearchParamKey<TRoutes>,
    listener: (value: string | null, previousValue: string | null) => void,
  ): () => void;
}
