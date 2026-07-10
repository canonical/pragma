/**
 * Legacy hand-rolled schema shape, kept for backwards compatibility.
 *
 * Prefer a real Standard Schema v1 validator ({@link StandardSchemaV1});
 * this shape predates the router's spec alignment and carries its output
 * type on a non-standard `output` phantom property.
 */
export interface StandardSchemaLike<TOutput = unknown> {
  readonly "~standard": {
    readonly output?: TOutput;
    readonly validate?: (value: unknown) => unknown;
  };
}

/** A single validation issue, as defined by the Standard Schema spec. */
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
 * Any schema the router accepts: a Standard Schema v1 validator or the
 * legacy hand-rolled shape.
 */
export type SchemaLike<TOutput = unknown> =
  | StandardSchemaV1<unknown, TOutput>
  | StandardSchemaLike<TOutput>;

type InferLegacyOutput<TSchema> =
  TSchema extends StandardSchemaLike<infer TLegacyOutput>
    ? TLegacyOutput
    : Record<string, never>;

/**
 * Infer a schema's output type.
 *
 * Standard Schema v1 carries it on the `types.output` phantom property
 * (discriminated by the required `version`/`vendor` members); the legacy
 * shape carries it on `output`. Falls back to an empty record when neither
 * is present.
 */
export type InferOutput<TSchema> = TSchema extends {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: string;
    readonly types?: infer TTypes;
  };
}
  ? [NonNullable<TTypes>] extends [{ readonly output: infer TOutput }]
    ? TOutput
    : InferLegacyOutput<TSchema>
  : InferLegacyOutput<TSchema>;

export type BivariantCallback<TArgs extends readonly unknown[], TResult> = {
  bivarianceHack(...args: TArgs): TResult;
}["bivarianceHack"];

export type StripParamModifier<TParam extends string> =
  TParam extends `${infer TName}(${string}`
    ? TName
    : TParam extends `${infer TName}?`
      ? TName
      : TParam extends `${infer TName}*`
        ? TName
        : TParam extends `${infer TName}+`
          ? TName
          : TParam;

export type ParamNames<TPath extends string> =
  TPath extends `${string}:${infer TParam}/${infer TRest}`
    ? StripParamModifier<TParam> | ParamNames<`/${TRest}`>
    : TPath extends `${string}:${infer TParam}`
      ? StripParamModifier<TParam>
      : never;

export type RouteParams<TPath extends string> = [ParamNames<TPath>] extends [
  never,
]
  ? Record<string, never>
  : {
      readonly [TKey in ParamNames<TPath>]: string;
    };

export type RouteParamValues = Readonly<Record<string, string>>;

export type InferSearch<TSchema> = InferOutput<TSchema>;

/**
 * The params a route's `content`/`prefetch` receive: the params schema's
 * output when one is declared, otherwise the raw string params inferred
 * from the path pattern.
 */
export type InferParams<TPath extends string, TParamsSchema> = [
  Exclude<TParamsSchema, undefined>,
] extends [never]
  ? RouteParams<TPath>
  : [Exclude<TParamsSchema, undefined>] extends [SchemaLike<unknown>]
    ? unknown extends InferOutput<Exclude<TParamsSchema, undefined>>
      ? // The schema's output is unknowable (e.g. a widened `SchemaLike`
        // from contextual inference) — fall back to the path-derived params.
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
  readonly prefetch?: BivariantCallback<
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
  TSearchSchema extends SchemaLike<unknown> | undefined = undefined,
  TRendered = unknown,
  TParamsSchema extends SchemaLike<unknown> | undefined = undefined,
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
  TSearchSchema extends SchemaLike<unknown> | undefined = undefined,
  TRendered = unknown,
  TWrappers extends readonly AnyWrapper[] = readonly [],
  TParamsSchema extends SchemaLike<unknown> | undefined = undefined,
> {
  readonly url: TPath;
  readonly content: RouteContent<
    TPath,
    TSearchSchema,
    TRendered,
    TParamsSchema
  >;
  readonly prefetch?: BivariantCallback<
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
  TParamsSchema extends SchemaLike<unknown> | undefined = undefined,
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
  TSearchSchema extends SchemaLike<unknown> | undefined = undefined,
  TRendered = unknown,
  TWrappers extends readonly AnyWrapper[] = readonly [],
  TParamsSchema extends SchemaLike<unknown> | undefined = undefined,
> =
  | DataRouteInput<TPath, TSearchSchema, TRendered, TWrappers, TParamsSchema>
  | RedirectRouteInput<TPath, string, TWrappers, TParamsSchema>;

export interface DataRouteDefinition<
  TPath extends string = string,
  TSearchSchema extends SchemaLike<unknown> | undefined = undefined,
  TRendered = unknown,
  TWrappers extends readonly AnyWrapper[] = readonly [],
  TParamsSchema extends SchemaLike<unknown> | undefined = undefined,
> extends RouteCodec<TPath, InferParams<TPath, TParamsSchema>> {
  readonly url: TPath;
  readonly content: RouteContent<
    TPath,
    TSearchSchema,
    TRendered,
    TParamsSchema
  >;
  readonly prefetch?: BivariantCallback<
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
  TParamsSchema extends SchemaLike<unknown> | undefined = undefined,
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
  TSearchSchema extends SchemaLike<unknown> | undefined = undefined,
  TRendered = unknown,
  TWrappers extends readonly AnyWrapper[] = readonly [],
  TParamsSchema extends SchemaLike<unknown> | undefined = undefined,
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
  readonly prefetch?: BivariantCallback<
    [params: unknown, search: unknown, context: NavigationContext],
    void | Promise<void>
  >;
  readonly params?: SchemaLike<unknown>;
  readonly search?: SchemaLike<unknown>;
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

export type UnionToIntersection<TUnion> = (
  TUnion extends unknown
    ? (value: TUnion) => void
    : never
) extends (value: infer TIntersection) => void
  ? TIntersection
  : never;

export type BuildPathFn<TRoutes extends RouteMap> = UnionToIntersection<
  {
    [TName in RouteName<TRoutes>]: (
      name: TName,
      ...args: RouteArgs<TRoutes, TName>
    ) => string;
  }[RouteName<TRoutes>]
>;

export type NavigateFn<TRoutes extends RouteMap> = UnionToIntersection<
  {
    [TName in RouteName<TRoutes>]: (
      name: TName,
      ...args: RouteArgs<TRoutes, TName>
    ) => RouteIntent<TRoutes, TName>;
  }[RouteName<TRoutes>]
>;

export type PrefetchFn<TRoutes extends RouteMap> = UnionToIntersection<
  {
    [TName in RouteName<TRoutes>]: (
      name: TName,
      ...args: RouteArgs<TRoutes, TName>
    ) => Promise<void>;
  }[RouteName<TRoutes>]
>;

export type ParamsOf<TRoute extends AnyRoute> = TRoute extends {
  readonly url: infer TPath extends string;
  readonly params?: infer TParamsSchema;
}
  ? InferParams<TPath, TParamsSchema>
  : Record<string, never>;

export type SearchOf<TRoute extends AnyRoute> = TRoute extends {
  readonly search?: infer TSearchSchema;
}
  ? [Exclude<TSearchSchema, undefined>] extends [never]
    ? Record<string, never>
    : InferOutput<Exclude<TSearchSchema, undefined>>
  : Record<string, never>;

export type HasParams<TRoute extends AnyRoute> = TRoute extends {
  readonly url: infer TPath extends string;
}
  ? ParamNames<TPath> extends never
    ? false
    : true
  : false;

export type PathBuildOptions<TRoute extends AnyRoute> = {
  readonly search?: NoInfer<SearchOf<TRoute>>;
  readonly hash?: string;
  /** When true, the navigation replaces the current history entry. */
  readonly replace?: boolean;
} & (HasParams<TRoute> extends true
  ? { readonly params: NoInfer<ParamsOf<TRoute>> }
  : { readonly params?: NoInfer<ParamsOf<TRoute>> });

export type PathBuildArgs<TRoute extends AnyRoute> =
  HasParams<TRoute> extends true
    ? [options: PathBuildOptions<TRoute>]
    : [options?: PathBuildOptions<TRoute>];

export interface NavigationIntent<
  TName extends string,
  TRoute extends AnyRoute,
> {
  readonly name: TName;
  readonly href: string;
  readonly params: ParamsOf<TRoute>;
  readonly search: SearchOf<TRoute>;
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
    key: string,
    listener: (value: string | null, previousValue: string | null) => void,
  ): () => void;
}

export interface RouterBlocker {
  readonly id: string;
  readonly isActive: () => boolean;
}

export interface PlatformNavigateOptions {
  readonly replace?: boolean;
  readonly state?: unknown;
}

export interface PlatformAdapter {
  getLocation(): string | URL;
  navigate(url: string, options?: PlatformNavigateOptions): void;
  subscribe(callback: (location: string | URL) => void): () => void;
}

export interface MemoryAdapter extends PlatformAdapter {
  back(): void;
  forward(): void;
}

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
  readonly store: RouterStore<TRoutes, TNotFound>;
  getRoute<TName extends RouteName<TRoutes>>(
    name: TName,
  ): RouteOf<TRoutes, TName>;
  getState(): RouterState<TRoutes, TNotFound>;
  getTrackedLocation(
    onAccess: (key: RouterLocationKey) => void,
  ): TrackedLocation<RouterLocationState>;
  buildPath: BuildPathFn<TRoutes>;
  dehydrate(): RouterDehydratedState<TRoutes> | null;
  dispose(): void;
  hydrate(
    state: RouterDehydratedState<TRoutes>,
  ): RouterLoadResult<TRoutes, TNotFound>;
  load(url: string | URL): Promise<RouterLoadResult<TRoutes, TNotFound>>;
  match(url: string | URL): RouterMatch<TRoutes, TNotFound> | null;
  navigate: NavigateFn<TRoutes>;
  prefetch: PrefetchFn<TRoutes>;
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
    key: string,
    listener: (value: string | null, previousValue: string | null) => void,
  ): () => void;
}
