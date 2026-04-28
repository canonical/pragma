import FocusManager from "../a11y/FocusManager.js";
import RouteAnnouncer from "../a11y/RouteAnnouncer.js";
import ScrollManager from "../a11y/ScrollManager.js";
import ViewTransitionManager from "../a11y/ViewTransitionManager.js";
import buildUrl from "./buildUrl.js";
import createRouterStore from "./createRouterStore.js";
import { matchPath, renderPattern, splitPathSegments } from "./pathUtils.js";
import RouteRedirect from "./RouteRedirect.js";
import StatusResponse from "./StatusResponse.js";
import type {
  AnyRoute,
  BuildPathFn,
  NamedRouteMatch,
  NavigateFn,
  NavigationIntent,
  NotFoundRouteMatch,
  ParamsOf,
  PathBuildArgs,
  PlatformNavigateOptions,
  PrefetchFn,
  RouteMap,
  RouteMiddleware,
  RouteModule,
  RouteName,
  RouteOf,
  Router,
  RouterAccessibilityContext,
  RouterAccessibilityDocumentLike,
  RouterBlocker,
  RouterDehydratedState,
  RouterLoadResult,
  RouterMatch,
  RouterOptions,
  SearchOf,
} from "./types.js";

type NavigationMode = "initial" | "none" | "pop" | "push";

function toHref(input: string | URL): string {
  const url = buildUrl(input);

  return `${url.pathname}${url.search}${url.hash}`;
}

function getGlobalDocument(): RouterAccessibilityDocumentLike | null {
  return (
    (globalThis as { document?: RouterAccessibilityDocumentLike }).document ??
    null
  );
}

function getGlobalScrollWindow(): {
  readonly pageXOffset?: number;
  readonly pageYOffset?: number;
  readonly scrollX?: number;
  readonly scrollY?: number;
  readonly sessionStorage?: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
  };
  scrollTo(position: { left: number; top: number }): void;
} | null {
  return (
    (
      globalThis as {
        window?: {
          readonly pageXOffset?: number;
          readonly pageYOffset?: number;
          readonly scrollX?: number;
          readonly scrollY?: number;
          readonly sessionStorage?: {
            getItem(key: string): string | null;
            setItem(key: string, value: string): void;
          };
          scrollTo(position: { left: number; top: number }): void;
        };
      }
    ).window ?? null
  );
}

function getGlobalAnnouncerDocument(): {
  readonly body?: { appendChild(child: unknown): void };
  createElement(tagName: "div"): {
    textContent: string;
    setAttribute(name: string, value: string): void;
  };
} | null {
  return (
    (
      globalThis as {
        document?: {
          readonly body?: { appendChild(child: unknown): void };
          createElement(tagName: "div"): {
            textContent: string;
            setAttribute(name: string, value: string): void;
          };
        };
      }
    ).document ?? null
  );
}

function getGlobalTransitionDocument(): {
  startViewTransition?(
    update: () => void | Promise<void>,
  ): { finished?: Promise<void> } | undefined;
} | null {
  return (
    (
      globalThis as {
        document?: {
          startViewTransition?(
            update: () => void | Promise<void>,
          ): { finished?: Promise<void> } | undefined;
        };
      }
    ).document ?? null
  );
}

function resolveAccessibilityContext(
  result: RouterLoadResult<RouteMap, AnyRoute | undefined>,
): RouterAccessibilityContext {
  return {
    location: result.location,
    match: result.match as RouterMatch<RouteMap, AnyRoute | undefined> | null,
    status: result.status,
  };
}

function resolveAnnouncement(
  documentLike: RouterAccessibilityDocumentLike | null,
  result: RouterLoadResult<RouteMap, AnyRoute | undefined>,
): string {
  const title = documentLike?.title.trim();

  if (title) {
    return title;
  }

  const heading = documentLike?.querySelector("h1")?.textContent?.trim();

  if (heading) {
    return heading;
  }

  return result.location.pathname;
}

function getRoutePriority(path: string): {
  readonly staticCount: number;
  readonly parameterCount: number;
  readonly wildcardCount: number;
} {
  const segments = splitPathSegments(path);

  let staticCount = 0;
  let parameterCount = 0;
  let wildcardCount = 0;

  for (const currentSegment of segments) {
    if (currentSegment === "*") {
      wildcardCount += 1;
      continue;
    }

    if (currentSegment.startsWith(":")) {
      parameterCount += 1;
      continue;
    }

    staticCount += 1;
  }

  return { staticCount, parameterCount, wildcardCount };
}

function compareRoutePriority(leftPath: string, rightPath: string): number {
  const left = getRoutePriority(leftPath);
  const right = getRoutePriority(rightPath);

  if (right.staticCount !== left.staticCount) {
    return right.staticCount - left.staticCount;
  }

  if (right.parameterCount !== left.parameterCount) {
    return right.parameterCount - left.parameterCount;
  }

  if (left.wildcardCount !== right.wildcardCount) {
    return left.wildcardCount - right.wildcardCount;
  }

  return 0;
}

function readSearchParams(
  searchParams: URLSearchParams,
): Record<string, string> {
  const rawSearch: Record<string, string> = {};

  for (const key of new Set(searchParams.keys())) {
    rawSearch[key] = searchParams.get(key)!;
  }

  return rawSearch;
}

function validateSearch<TRoute extends AnyRoute>(
  route: TRoute,
  url: URL,
): SearchOf<TRoute> {
  if (!route.search) {
    return {} as SearchOf<TRoute>;
  }

  const rawSearch = readSearchParams(url.searchParams);
  const validator = route.search["~standard"].validate;

  if (!validator) {
    return rawSearch as SearchOf<TRoute>;
  }

  const result = validator(rawSearch);

  if (
    typeof result === "object" &&
    result !== null &&
    "issues" in result &&
    Array.isArray((result as { issues: unknown }).issues)
  ) {
    const issues = (result as { issues: ReadonlyArray<{ message?: string }> })
      .issues;
    const messages = issues
      .map((issue) => issue.message ?? "Validation error")
      .join(", ");
    throw new Error(`Search param validation failed: ${messages}`);
  }

  if (typeof result === "object" && result !== null && "value" in result) {
    return (result as { value: unknown }).value as SearchOf<TRoute>;
  }

  return result as SearchOf<TRoute>;
}

function buildHash(hash?: string): string {
  if (!hash) {
    return "";
  }

  return hash.startsWith("#") ? hash : `#${hash}`;
}

function buildSearch(search: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(search)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined) {
          continue;
        }

        searchParams.append(key, String(item));
      }

      continue;
    }

    searchParams.append(key, String(value));
  }

  const serializedSearch = searchParams.toString();
  return serializedSearch.length > 0 ? `?${serializedSearch}` : "";
}

function readBuildOptions<TRoute extends AnyRoute>(
  args: PathBuildArgs<TRoute>,
): {
  params: ParamsOf<TRoute>;
  search: SearchOf<TRoute>;
  hash?: string;
} {
  const [options] = args;

  return {
    params: (options?.params ?? {}) as ParamsOf<TRoute>,
    search: (options?.search ?? {}) as SearchOf<TRoute>,
    hash: options?.hash,
  };
}

function assertUniqueWrapperIds(routes: RouteMap, notFound?: AnyRoute): void {
  const wrappersById = new Map<string, object>();
  const routesToValidate = notFound
    ? { ...routes, __notFound: notFound }
    : routes;

  for (const [routeName, currentRoute] of Object.entries(routesToValidate)) {
    const seenIds = new Set<string>();

    for (const currentWrapper of currentRoute.wrappers) {
      if (seenIds.has(currentWrapper.id)) {
        throw new Error(
          `Route '${routeName}' contains wrapper id '${currentWrapper.id}' more than once.`,
        );
      }

      seenIds.add(currentWrapper.id);

      const existingWrapper = wrappersById.get(currentWrapper.id);

      if (!existingWrapper) {
        wrappersById.set(currentWrapper.id, currentWrapper as object);
        continue;
      }

      if (existingWrapper !== currentWrapper) {
        throw new Error(
          `Wrapper id '${currentWrapper.id}' is attached to multiple wrapper definitions.`,
        );
      }
    }
  }
}

function createIntent<
  TRoutes extends RouteMap,
  TName extends RouteName<TRoutes>,
>(
  routes: TRoutes,
  name: TName,
  args: PathBuildArgs<RouteOf<TRoutes, TName>>,
): NavigationIntent<TName, RouteOf<TRoutes, TName>> {
  const currentRoute = routes[name];
  const options = readBuildOptions(args);
  const href = `${currentRoute.render(options.params)}${buildSearch(options.search as Record<string, unknown>)}${buildHash(options.hash)}`;

  return {
    name,
    href,
    params: options.params,
    search: options.search,
    hash: options.hash,
  };
}

function applyRouteMapMiddleware<TRoutes extends RouteMap>(
  routes: TRoutes,
  middleware: readonly RouteMiddleware[],
): TRoutes {
  if (middleware.length === 0) {
    return routes;
  }

  return Object.fromEntries(
    Object.entries(routes).map(([routeName, route]) => {
      const transformedRoute = [...middleware]
        .reverse()
        .reduce<AnyRoute>((currentRoute, currentMiddleware) => {
          return currentMiddleware(currentRoute);
        }, route);

      return [
        routeName,
        {
          ...transformedRoute,
          parse(input: string | URL) {
            return matchPath(transformedRoute.url, buildUrl(input));
          },
          render(params: Record<string, string> | Record<string, never>) {
            return renderPattern(
              transformedRoute.url,
              params as Record<string, string>,
            );
          },
        },
      ];
    }),
  ) as TRoutes;
}

function createRouteMatch<
  TRoutes extends RouteMap,
  TName extends RouteName<TRoutes>,
>(
  name: TName,
  route: RouteOf<TRoutes, TName>,
  url: URL,
  params: ParamsOf<RouteOf<TRoutes, TName>>,
): NamedRouteMatch<TRoutes, TName> {
  const search = validateSearch(route, url);

  if ("redirect" in route) {
    return {
      kind: "redirect",
      name,
      route,
      params,
      search,
      pathname: url.pathname,
      redirectTo: renderPattern(
        route.redirect as string,
        params as Record<string, string>,
      ),
      status: route.status,
      url,
    } as unknown as NamedRouteMatch<TRoutes, TName>;
  }

  return {
    kind: "route",
    name,
    route,
    params,
    search,
    pathname: url.pathname,
    status: 200,
    url,
  } as unknown as NamedRouteMatch<TRoutes, TName>;
}

function createNotFoundMatch<TNotFound extends AnyRoute>(
  route: TNotFound,
  url: URL,
): NotFoundRouteMatch<TNotFound> {
  return {
    kind: "not-found",
    name: null,
    route,
    params: {} as ParamsOf<TNotFound>,
    search: validateSearch(route, url),
    pathname: url.pathname,
    status: 404,
    url,
  };
}

function getErrorStatus(error: unknown): number {
  if (error instanceof StatusResponse) {
    return error.status;
  }

  if (error instanceof Response) {
    return error.status;
  }

  return 500;
}

function isRedirectMatch(value: unknown): value is {
  readonly kind: "redirect";
  readonly redirectTo: string;
} {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { readonly kind?: string }).kind === "redirect"
  );
}

/**
 * Intentional no-op `.catch()` handler for fire-and-forget loads.
 *
 * Scheduled loads (navigate, prefetch, adapter pop) run asynchronously.  When a
 * newer navigation supersedes an in-flight one, the earlier load is aborted and
 * its rejection is harmless.  Attaching this handler prevents an unhandled
 * promise rejection without swallowing errors that matter — the active load's
 * result is always awaited directly where it is needed.
 */
function ignoreScheduledLoadError(_error: unknown): void {}

function createDehydratedState<
  TRoutes extends RouteMap,
  TNotFound extends AnyRoute | undefined,
>(
  result: Pick<
    RouterLoadResult<TRoutes, TNotFound>,
    "location" | "match" | "status"
  >,
): RouterDehydratedState<TRoutes> {
  const kind =
    result.match?.kind === "route"
      ? "route"
      : result.match?.kind === "not-found"
        ? "not-found"
        : "unmatched";

  return {
    href: result.location.href,
    kind,
    routeId: result.match?.kind === "route" ? result.match.name : null,
    status: result.status,
  };
}

function createLoadResult<
  TRoutes extends RouteMap,
  TNotFound extends AnyRoute | undefined,
>(
  result: Omit<RouterLoadResult<TRoutes, TNotFound>, "dehydrate">,
): RouterLoadResult<TRoutes, TNotFound> {
  return {
    ...result,
    dehydrate() {
      return createDehydratedState(result);
    },
  };
}

interface ResolvedLoadData<
  TRoutes extends RouteMap,
  TNotFound extends AnyRoute | undefined,
> {
  readonly match: RouterMatch<TRoutes, TNotFound> | null;
  readonly status: number;
}

function createIdleSignal(): AbortSignal {
  return new AbortController().signal;
}

/** Create a typed router view over a complete flat route map. */
export default function createRouter<
  const TRoutes extends RouteMap,
  const TNotFound extends AnyRoute | undefined = undefined,
>(
  routes: TRoutes,
  options?: RouterOptions<TNotFound>,
): Router<TRoutes, TNotFound> {
  const middleware = options?.middleware ?? [];
  const resolvedRoutes = applyRouteMapMiddleware(routes, middleware);

  assertUniqueWrapperIds(resolvedRoutes, options?.notFound);

  const adapter = options?.adapter ?? null;
  const accessibilityDocument =
    options?.accessibility?.document ?? getGlobalDocument();
  const scrollWindow = getGlobalScrollWindow();
  const announcerDocument = getGlobalAnnouncerDocument();
  const transitionDocument = getGlobalTransitionDocument();
  const scrollManager =
    options?.accessibility?.scrollManager === false
      ? null
      : (options?.accessibility?.scrollManager ??
        (scrollWindow
          ? new ScrollManager(scrollWindow, {
              document: accessibilityDocument
                ? {
                    getElementById(id) {
                      const element = accessibilityDocument.querySelector(
                        `#${id}`,
                      );

                      return element && "scrollIntoView" in element
                        ? (element as { scrollIntoView(): void })
                        : null;
                    },
                  }
                : undefined,
              sessionStorage: scrollWindow.sessionStorage,
            })
          : null));
  const focusManager =
    options?.accessibility?.focusManager === false
      ? null
      : (options?.accessibility?.focusManager ??
        (accessibilityDocument
          ? new FocusManager({
              querySelector(selector) {
                const element = accessibilityDocument.querySelector(selector);

                return element &&
                  "focus" in element &&
                  "getAttribute" in element &&
                  "setAttribute" in element
                  ? (element as {
                      focus(options?: { preventScroll?: boolean }): void;
                      getAttribute(name: string): string | null;
                      setAttribute(name: string, value: string): void;
                    })
                  : null;
              },
            })
          : null));
  const routeAnnouncer =
    options?.accessibility?.routeAnnouncer === false
      ? null
      : (options?.accessibility?.routeAnnouncer ??
        (announcerDocument ? new RouteAnnouncer(announcerDocument) : null));
  const viewTransition =
    options?.accessibility?.viewTransition === false
      ? null
      : (options?.accessibility?.viewTransition ??
        (transitionDocument
          ? new ViewTransitionManager(transitionDocument)
          : null));

  const sortedRoutes = Object.entries(resolvedRoutes).sort(
    ([, leftRoute], [, rightRoute]) => {
      return compareRoutePriority(leftRoute.url, rightRoute.url);
    },
  ) as Array<[RouteName<TRoutes>, RouteOf<TRoutes, RouteName<TRoutes>>]>;

  let activeAbortController: AbortController | null = null;
  let currentLoadResult: RouterLoadResult<TRoutes, TNotFound> | null = null;
  let hydratedHref: string | null = null;
  let ignoredAdapterHref: string | null = null;
  const pendingPrefetches = new Map<string, Promise<void>>();
  const prefetchedLoads = new Map<
    string,
    ResolvedLoadData<TRoutes, TNotFound>
  >();
  const preloadedModules = new Map<string, WeakRef<RouteModule>>();
  const preloadedModuleRegistry = new FinalizationRegistry<string>((key) => {
    preloadedModules.delete(key);
  });

  function readPreloadedModule(key: string): RouteModule | null {
    const module = preloadedModules.get(key)?.deref() ?? null;

    if (!module) {
      preloadedModules.delete(key);
    }

    return module;
  }

  function cachePreloadedModule(key: string, module: RouteModule): void {
    preloadedModules.set(key, new WeakRef(module));
    preloadedModuleRegistry.register(module, key);
  }

  async function preloadMatchedContent(
    currentMatch: Exclude<
      RouterMatch<TRoutes, TNotFound>,
      { readonly kind: "redirect" }
    > | null,
  ): Promise<RouteModule | null> {
    if (!currentMatch) {
      return null;
    }

    const preloadKey =
      currentMatch.kind === "route" ? currentMatch.name : "__notFound";
    const preloader = currentMatch?.route.content?.preload;

    if (!preloadKey || !preloader) {
      return null;
    }

    const cachedModule = readPreloadedModule(preloadKey);

    if (cachedModule) {
      return cachedModule;
    }

    const loadedModule = await preloader();

    cachePreloadedModule(preloadKey, loadedModule);

    return loadedModule;
  }

  async function resolveLoadData(
    currentMatch: RouterMatch<TRoutes, TNotFound> | null,
    signal: AbortSignal,
  ): Promise<ResolvedLoadData<TRoutes, TNotFound>> {
    const nextRoute = currentMatch?.route;

    // Fire prefetch hooks as fire-and-forget side effects.
    // Wrapper prefetches run for all wrappers (no caching/reuse).
    // Route prefetch runs if defined. None block rendering.
    if (nextRoute) {
      for (const currentWrapper of nextRoute.wrappers) {
        if (currentWrapper.prefetch) {
          const currentParams = currentMatch?.params as ParamsOf<AnyRoute>;

          void Promise.resolve(
            currentWrapper.prefetch(currentParams, { signal }),
          ).catch(ignoreScheduledLoadError);
        }
      }

      if (nextRoute.prefetch && currentMatch) {
        void Promise.resolve(
          nextRoute.prefetch(currentMatch.params, currentMatch.search, {
            signal,
          }),
        ).catch(ignoreScheduledLoadError);
      }
    }

    await preloadMatchedContent(
      currentMatch as Exclude<
        RouterMatch<TRoutes, TNotFound>,
        { readonly kind: "redirect" }
      > | null,
    );

    return {
      match: currentMatch,
      status: currentMatch?.status ?? 404,
    };
  }

  const prefetchHref = async (
    input: string | URL,
    redirectDepth = 0,
  ): Promise<void> => {
    if (redirectDepth > 10) {
      throw new Error("Too many redirects during router.prefetch().");
    }

    const url = buildUrl(input);
    const currentMatch = match(url);
    const redirectMatch = currentMatch as unknown;

    if (isRedirectMatch(redirectMatch)) {
      await prefetchHref(redirectMatch.redirectTo, redirectDepth + 1);
      return;
    }

    const href = toHref(url);

    if (prefetchedLoads.has(href)) {
      return;
    }

    const pendingPrefetch = pendingPrefetches.get(href);

    if (pendingPrefetch) {
      await pendingPrefetch;
      return;
    }

    const prefetchPromise = (async () => {
      try {
        const prefetchedLoad = await resolveLoadData(
          currentMatch,
          createIdleSignal(),
        );

        prefetchedLoads.set(href, prefetchedLoad);
      } catch (thrownError) {
        if (thrownError instanceof RouteRedirect) {
          await prefetchHref(thrownError.to, redirectDepth + 1);
          return;
        }

        throw thrownError;
      } finally {
        pendingPrefetches.delete(href);
      }
    })();

    pendingPrefetches.set(href, prefetchPromise);
    await prefetchPromise;
  };

  function syncAdapterLocation(
    input: string | URL,
    navigationOptions?: PlatformNavigateOptions,
  ): void {
    const currentAdapter = adapter as NonNullable<typeof adapter>;

    const href = toHref(input);

    ignoredAdapterHref = href;
    currentAdapter.navigate(href, navigationOptions);
  }

  function saveScrollPosition(): void {
    scrollManager?.save(store.getState().location.href);
  }

  function scheduleAccessibilityEffects(
    result: RouterLoadResult<TRoutes, TNotFound>,
    mode: NavigationMode,
  ): void {
    if (mode !== "pop" && mode !== "push") {
      return;
    }

    queueMicrotask(() => {
      const context = resolveAccessibilityContext(
        result as unknown as RouterLoadResult<RouteMap, AnyRoute | undefined>,
      );
      const nextTitle = options?.accessibility?.getTitle?.(context);

      if (
        nextTitle !== undefined &&
        nextTitle !== null &&
        accessibilityDocument
      ) {
        accessibilityDocument.title = nextTitle;
      }

      scrollManager?.restore(result.location.href, mode);
      focusManager?.focus();
      void routeAnnouncer?.announce(
        resolveAnnouncement(
          accessibilityDocument,
          result as unknown as RouterLoadResult<RouteMap, AnyRoute | undefined>,
        ),
      );
    });
  }

  async function runNavigationUpdate(
    mode: NavigationMode,
    update: () => void | Promise<void>,
  ): Promise<void> {
    if ((mode === "pop" || mode === "push") && viewTransition) {
      await viewTransition.run(update);
      return;
    }

    await update();
  }

  const buildPath: BuildPathFn<TRoutes> = ((
    name: RouteName<TRoutes>,
    ...args: unknown[]
  ) => {
    return createIntent(
      resolvedRoutes,
      name,
      args as unknown as PathBuildArgs<RouteOf<TRoutes, typeof name>>,
    ).href;
  }) as BuildPathFn<TRoutes>;

  let pendingNavigation: {
    href: string;
    replace: boolean;
    resolve: () => void;
  } | null = null;

  const navigate: NavigateFn<TRoutes> = ((
    name: RouteName<TRoutes>,
    ...args: unknown[]
  ) => {
    const buildArgs = args as unknown as PathBuildArgs<
      RouteOf<TRoutes, typeof name>
    >;
    const intent = createIntent(resolvedRoutes, name, buildArgs);
    const replace = (buildArgs[0] as { replace?: boolean } | undefined)
      ?.replace;

    if (adapter) {
      if (isBlocked()) {
        pendingNavigation = {
          href: intent.href,
          replace: replace ?? false,
          resolve: () => {
            pendingNavigation = null;
            saveScrollPosition();
            syncAdapterLocation(
              intent.href,
              replace ? { replace: true } : undefined,
            );
            void performLoad(
              intent.href,
              0,
              true,
              replace ? "pop" : "push",
            ).catch(ignoreScheduledLoadError);
          },
        };

        return intent;
      }

      saveScrollPosition();
      syncAdapterLocation(intent.href, replace ? { replace: true } : undefined);
      void performLoad(intent.href, 0, true, replace ? "pop" : "push").catch(
        ignoreScheduledLoadError,
      );
    }

    return intent;
  }) as NavigateFn<TRoutes>;

  const blockers = new Map<string, RouterBlocker>();

  function isBlocked(): boolean {
    for (const blocker of blockers.values()) {
      if (blocker.isActive()) {
        return true;
      }
    }

    return false;
  }

  function setSearchParams(
    params:
      | Record<string, string | null>
      | ((current: Record<string, string>) => Record<string, string | null>),
    options?: { readonly replace?: boolean },
  ): void {
    const currentState = store.getState();
    const currentUrl = buildUrl(currentState.location.href);
    const currentSearch: Record<string, string> = {};

    for (const key of new Set(currentUrl.searchParams.keys())) {
      currentSearch[key] = currentUrl.searchParams.get(key)!;
    }

    const nextParams =
      typeof params === "function" ? params(currentSearch) : params;

    const nextUrl = buildUrl(currentUrl.href);

    nextUrl.search = "";

    for (const [key, value] of Object.entries({
      ...currentSearch,
      ...nextParams,
    })) {
      if (value !== null) {
        nextUrl.searchParams.set(key, value);
      }
    }

    const href = toHref(nextUrl);
    const replace = options?.replace ?? false;

    if (adapter) {
      syncAdapterLocation(href, replace ? { replace: true } : undefined);
      void performLoad(href, 0, true, replace ? "pop" : "push").catch(
        ignoreScheduledLoadError,
      );
    }
  }

  const prefetch: PrefetchFn<TRoutes> = ((
    name: RouteName<TRoutes>,
    ...args: unknown[]
  ) => {
    const intent = createIntent(
      resolvedRoutes,
      name,
      args as unknown as PathBuildArgs<RouteOf<TRoutes, typeof name>>,
    );

    return prefetchHref(intent.href);
  }) as PrefetchFn<TRoutes>;

  const match = (
    input: string | URL,
  ): RouterMatch<TRoutes, TNotFound> | null => {
    const url = buildUrl(input);

    for (const [name, currentRoute] of sortedRoutes) {
      const params = matchPath(currentRoute.url, url);

      if (!params) {
        continue;
      }

      return createRouteMatch(
        name,
        currentRoute as RouteOf<TRoutes, typeof name>,
        url,
        params as ParamsOf<RouteOf<TRoutes, typeof name>>,
      ) as RouterMatch<TRoutes, TNotFound>;
    }

    if (!options?.notFound) {
      return null;
    }

    return createNotFoundMatch(options.notFound, url) as RouterMatch<
      TRoutes,
      TNotFound
    >;
  };

  const store = createRouterStore<TRoutes, TNotFound>(
    match,
    adapter?.getLocation() ?? options?.initialUrl,
  );

  const performLoad = async (
    input: string | URL,
    redirectDepth = 0,
    shouldSyncAdapter = false,
    mode: NavigationMode = "none",
  ): Promise<RouterLoadResult<TRoutes, TNotFound>> => {
    if (redirectDepth > 10) {
      throw new Error("Too many redirects during router.load().");
    }

    const url = buildUrl(input);
    const href = toHref(url);

    if (hydratedHref === href && currentLoadResult) {
      return currentLoadResult;
    }

    if (hydratedHref && hydratedHref !== href) {
      hydratedHref = null;
    }

    const currentMatch = match(url);
    const redirectMatch = currentMatch as unknown;

    if (isRedirectMatch(redirectMatch)) {
      const redirectedResult = await performLoad(
        redirectMatch.redirectTo,
        redirectDepth + 1,
        shouldSyncAdapter,
        mode,
      );

      if (
        shouldSyncAdapter &&
        adapter &&
        toHref(adapter.getLocation()) !== redirectedResult.location.href
      ) {
        syncAdapterLocation(redirectedResult.location.href, {
          replace: true,
        });
      }

      return redirectedResult;
    }

    const previousController = activeAbortController;
    const abortController = new AbortController();

    activeAbortController = abortController;
    previousController?.abort();
    store.setNavigationState("loading");

    try {
      const pendingPrefetch = pendingPrefetches.get(href);

      if (pendingPrefetch) {
        await pendingPrefetch.catch(ignoreScheduledLoadError);
      }

      if (abortController.signal.aborted) {
        throw new Error("aborted");
      }

      const prefetchedLoad = prefetchedLoads.get(href);
      const resolvedLoad =
        prefetchedLoad ??
        (await resolveLoadData(currentMatch, abortController.signal));

      prefetchedLoads.delete(href);

      let result!: RouterLoadResult<TRoutes, TNotFound>;

      await runNavigationUpdate(mode, () => {
        result = createLoadResult<TRoutes, TNotFound>({
          error: null,
          location: store.commit(url, resolvedLoad.match, resolvedLoad.status)
            .location,
          match: resolvedLoad.match,
          status: resolvedLoad.status,
        });

        currentLoadResult = result;
        prefetchedLoads.clear();
      });
      scheduleAccessibilityEffects(result, mode);

      return result;
    } catch (thrownError) {
      if (thrownError instanceof RouteRedirect) {
        abortController.abort();
        const redirectedResult = await performLoad(
          thrownError.to,
          redirectDepth + 1,
          shouldSyncAdapter,
          mode,
        );

        if (
          shouldSyncAdapter &&
          adapter &&
          toHref(adapter.getLocation()) !== redirectedResult.location.href
        ) {
          syncAdapterLocation(redirectedResult.location.href, {
            replace: true,
          });
        }

        return redirectedResult;
      }

      if (abortController.signal.aborted) {
        throw thrownError;
      }

      const status = getErrorStatus(thrownError);
      let result!: RouterLoadResult<TRoutes, TNotFound>;

      await runNavigationUpdate(mode, () => {
        result = createLoadResult<TRoutes, TNotFound>({
          error: thrownError,
          location: store.commit(url, currentMatch, status).location,
          match: currentMatch,
          status,
        });

        currentLoadResult = result;
      });
      scheduleAccessibilityEffects(result, mode);

      return result;
    } finally {
      if (activeAbortController === abortController) {
        activeAbortController = null;
        store.setNavigationState("idle");
      }
    }
  };

  const load = async (
    input: string | URL,
  ): Promise<RouterLoadResult<TRoutes, TNotFound>> => {
    return performLoad(input, 0, false, "none");
  };

  const hydrate = (
    state: RouterDehydratedState<TRoutes>,
  ): RouterLoadResult<TRoutes, TNotFound> => {
    const hydratedMatch = match(state.href);

    if (state.kind === "route") {
      if (
        hydratedMatch?.kind !== "route" ||
        hydratedMatch.name !== state.routeId
      ) {
        throw new Error(
          "Hydrated route state does not match the current route map.",
        );
      }
    } else if (state.kind === "not-found") {
      if (hydratedMatch?.kind !== "not-found") {
        throw new Error(
          "Hydrated not-found state does not match the current route map.",
        );
      }
    } else if (hydratedMatch !== null) {
      throw new Error(
        "Hydrated unmatched state does not match the current route map.",
      );
    }

    const result = createLoadResult<TRoutes, TNotFound>({
      error: null,
      location: store.commit(state.href, hydratedMatch, state.status).location,
      match: hydratedMatch,
      status: state.status,
    });

    currentLoadResult = result;
    hydratedHref = state.href;
    store.setNavigationState("idle");

    return result;
  };

  let unsubscribeFromAdapter: (() => void) | undefined;

  if (options?.hydratedState) {
    hydrate(options.hydratedState as RouterDehydratedState<TRoutes>);
  }

  if (adapter) {
    unsubscribeFromAdapter = adapter.subscribe((location) => {
      const href = toHref(location);

      if (ignoredAdapterHref === href) {
        ignoredAdapterHref = null;
        return;
      }

      saveScrollPosition();
      void performLoad(location, 0, true, "pop").catch(
        ignoreScheduledLoadError,
      );
    });
  }

  if (adapter) {
    void performLoad(adapter.getLocation(), 0, true, "initial").catch(
      ignoreScheduledLoadError,
    );
  }

  const render = (
    result: RouterLoadResult<TRoutes, TNotFound> | null = currentLoadResult,
  ): unknown => {
    if (!result?.match) {
      return null;
    }

    const currentRoute = result.match.route;

    if (!currentRoute.content) {
      return null;
    }

    return currentRoute.wrappers.reduceRight(
      (children, currentWrapper) => {
        return currentWrapper.component({
          children,
        });
      },
      currentRoute.content({
        params: result.match.params,
        search: result.match.search,
      }),
    );
  };

  return {
    adapter,
    routes: resolvedRoutes,
    notFound: options?.notFound as TNotFound,
    store,
    getRoute(name) {
      return resolvedRoutes[name];
    },
    getState() {
      return store.getState();
    },
    getTrackedLocation(onAccess) {
      return store.getTrackedLocation(onAccess);
    },
    buildPath,
    dehydrate() {
      return currentLoadResult?.dehydrate() ?? null;
    },
    dispose() {
      activeAbortController?.abort();
      unsubscribeFromAdapter?.();
    },
    hydrate,
    load,
    match,
    navigate,
    prefetch,
    get blockerState() {
      return pendingNavigation ? ("blocked" as const) : ("idle" as const);
    },
    proceedNavigation() {
      pendingNavigation?.resolve();
    },
    cancelNavigation() {
      pendingNavigation = null;
    },
    registerBlocker(blocker: RouterBlocker) {
      blockers.set(blocker.id, blocker);
    },
    unregisterBlocker(id: string) {
      blockers.delete(id);

      if (pendingNavigation) {
        pendingNavigation = null;
      }
    },
    render,
    setSearchParams,
    subscribe(listener) {
      return store.subscribe(listener);
    },
    subscribeToNavigation(listener) {
      return store.subscribeToNavigation(listener);
    },
    subscribeToSearchParam(key, listener) {
      return store.subscribeToSearchParam(key, listener);
    },
  };
}
