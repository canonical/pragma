export interface StandardSchemaLike<TOutput = unknown> {
  readonly "~standard": {
    readonly output?: TOutput;
    readonly validate?: (value: unknown) => unknown;
  };
}

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

export type InferSearch<TSchema> =
  TSchema extends StandardSchemaLike<infer TOutput>
    ? TOutput
    : Record<string, never>;

export interface NavigationContext {
  readonly signal: AbortSignal;
}

export type RouteModule = object;

export interface RouteContentProps<
  TParams extends RouteParamValues | Record<string, never> = Record<
    string,
    never
  >,
  TSearch = Record<string, never>,
  TData = void,
> {
  readonly params: TParams;
  readonly search: TSearch;
  readonly data: TData;
}

export interface RouteErrorProps<
  TPath extends string = string,
  TSearch = Record<string, never>,
> {
  readonly error: unknown;
  readonly status: number;
  readonly params: RouteParams<TPath>;
  readonly search: TSearch;
  readonly url: string;
}

export interface WrapperComponentProps<TData = void, TRendered = unknown> {
  readonly data: TData;
  readonly children: TRendered;
}

export interface WrapperErrorProps<
  TParams extends RouteParamValues = RouteParamValues,
  TSearch = unknown,
> {
  readonly error: unknown;
  readonly status: number;
  readonly params: TParams;
  readonly search: TSearch;
  readonly url: string;
}

export interface WrapperDefinition<TData = void, TRendered = unknown> {
  readonly id: string;
  readonly component: BivariantCallback<
    [props: WrapperComponentProps<TData, TRendered>],
    TRendered
  >;
  readonly fetch?: BivariantCallback<
    [params: RouteParamValues, context: NavigationContext],
    Promise<TData>
  >;
  readonly error?: BivariantCallback<[props: WrapperErrorProps], TRendered>;
}

export interface RouteCodec<TPath extends string = string> {
  parse(url: string | URL): RouteParams<TPath> | null;
  render(params: RouteParams<TPath>): string;
}

export type AnyWrapper = WrapperDefinition<unknown, unknown>;

export type RouteContent<
  TPath extends string = string,
  TSearchSchema extends StandardSchemaLike<unknown> | undefined = undefined,
  TData = void,
  TRendered = unknown,
> = BivariantCallback<
  [
    props: RouteContentProps<
      RouteParams<TPath>,
      InferSearch<TSearchSchema>,
      TData
    >,
  ],
  TRendered
> & {
  preload?: () => Promise<RouteModule>;
};

export type AnyRouteContent = BivariantCallback<
  [props: RouteContentProps<RouteParamValues, unknown, unknown>],
  unknown
> & {
  preload?: () => Promise<RouteModule>;
};

export interface DataRouteInput<
  TPath extends string = string,
  TSearchSchema extends StandardSchemaLike<unknown> | undefined = undefined,
  TData = void,
  TRendered = unknown,
  TWrappers extends readonly AnyWrapper[] = readonly [],
> {
  readonly url: TPath;
  readonly content: RouteContent<TPath, TSearchSchema, TData, TRendered>;
  readonly fetch?: BivariantCallback<
    [
      params: RouteParams<TPath>,
      search: InferSearch<TSearchSchema>,
      context: NavigationContext,
    ],
    Promise<TData>
  >;
  readonly search?: TSearchSchema;
  readonly error?: BivariantCallback<
    [props: RouteErrorProps<TPath, InferSearch<TSearchSchema>>],
    TRendered
  >;
  readonly wrappers?: TWrappers;
}

export type StaticRedirectStatus = 301 | 308;

export interface RedirectRouteInput<
  TPath extends string = string,
  TTarget extends string = string,
  TWrappers extends readonly AnyWrapper[] = readonly [],
> {
  readonly url: TPath;
  readonly redirect: TTarget;
  readonly status: StaticRedirectStatus;
  readonly wrappers?: TWrappers;
}

export type RouteInput<
  TPath extends string = string,
  TSearchSchema extends StandardSchemaLike<unknown> | undefined = undefined,
  TData = void,
  TRendered = unknown,
  TWrappers extends readonly AnyWrapper[] = readonly [],
> =
  | DataRouteInput<TPath, TSearchSchema, TData, TRendered, TWrappers>
  | RedirectRouteInput<TPath, string, TWrappers>;

export interface DataRouteDefinition<
  TPath extends string = string,
  TSearchSchema extends StandardSchemaLike<unknown> | undefined = undefined,
  TData = void,
  TRendered = unknown,
  TWrappers extends readonly AnyWrapper[] = readonly [],
> extends RouteCodec<TPath> {
  readonly url: TPath;
  readonly content: RouteContent<TPath, TSearchSchema, TData, TRendered>;
  readonly fetch?: BivariantCallback<
    [
      params: RouteParams<TPath>,
      search: InferSearch<TSearchSchema>,
      context: NavigationContext,
    ],
    Promise<TData>
  >;
  readonly search?: TSearchSchema;
  readonly error?: BivariantCallback<
    [props: RouteErrorProps<TPath, InferSearch<TSearchSchema>>],
    TRendered
  >;
  readonly wrappers: TWrappers;
}

export interface RedirectRouteDefinition<
  TPath extends string = string,
  TTarget extends string = string,
  TWrappers extends readonly AnyWrapper[] = readonly [],
> extends RouteCodec<TPath> {
  readonly url: TPath;
  readonly redirect: TTarget;
  readonly status: StaticRedirectStatus;
  readonly wrappers: TWrappers;
}

export type RouteDefinition<
  TPath extends string = string,
  TSearchSchema extends StandardSchemaLike<unknown> | undefined = undefined,
  TData = void,
  TRendered = unknown,
  TWrappers extends readonly AnyWrapper[] = readonly [],
> =
  | DataRouteDefinition<TPath, TSearchSchema, TData, TRendered, TWrappers>
  | RedirectRouteDefinition<TPath, string, TWrappers>;

export interface AnyRoute {
  readonly url: string;
  readonly content?: AnyRouteContent;
  readonly fetch?: BivariantCallback<
    [params: unknown, search: unknown, context: NavigationContext],
    Promise<unknown>
  >;
  readonly search?: StandardSchemaLike<unknown>;
  readonly error?: BivariantCallback<
    [props: RouteErrorProps<string, unknown>],
    unknown
  >;
  readonly redirect?: string;
  readonly status?: number;
  readonly wrappers: readonly AnyWrapper[];
  parse(url: string | URL): RouteParamValues | Record<string, never> | null;
  render(params: RouteParamValues | Record<string, never>): string;
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
}
  ? RouteParams<TPath>
  : Record<string, never>;

export type SearchOf<TRoute extends AnyRoute> =
  TRoute extends DataRouteDefinition<
    string,
    infer TSearchSchema,
    unknown,
    unknown,
    readonly AnyWrapper[]
  >
    ? InferSearch<TSearchSchema>
    : Record<string, never>;

export type DataOf<TRoute extends AnyRoute> =
  TRoute extends DataRouteDefinition<
    string,
    StandardSchemaLike<unknown> | undefined,
    infer TData,
    unknown,
    readonly AnyWrapper[]
  >
    ? TData
    : never;

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

export interface RouterLoadErrorBoundary {
  readonly type: "route" | "wrapper";
  readonly wrapperId: string | null;
}

export interface RouterDehydratedState<TRoutes extends RouteMap = RouteMap> {
  readonly href: string;
  readonly kind: "route" | "not-found" | "unmatched";
  readonly routeId: RouteName<TRoutes> | null;
  readonly routeData: unknown;
  readonly status: number;
  readonly wrapperData: Readonly<Record<string, unknown>>;
}

export interface RouterLoadResult<
  TRoutes extends RouteMap,
  TNotFound extends AnyRoute | undefined = undefined,
> {
  dehydrate(): RouterDehydratedState<TRoutes>;
  readonly error: unknown;
  readonly errorBoundary: RouterLoadErrorBoundary | null;
  readonly location: RouterLocationState;
  readonly match: RouterMatch<TRoutes, TNotFound> | null;
  readonly routeData: unknown;
  readonly status: number;
  readonly wrapperData: Readonly<Record<string, unknown>>;
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
  render(result?: RouterLoadResult<TRoutes, TNotFound> | null): unknown;
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
