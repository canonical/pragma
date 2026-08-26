import FocusManager from "../a11y/FocusManager.js";
import RouteAnnouncer from "../a11y/RouteAnnouncer.js";
import ScrollManager from "../a11y/ScrollManager.js";
import ViewTransitionManager from "../a11y/ViewTransitionManager.js";
import buildUrl from "./buildUrl.js";
import createRouterStore from "./createRouterStore.js";
import createSubject from "./createSubject.js";
import {
  createRouteCodec,
  matchPath,
  renderPattern,
  splitPathSegments,
} from "./pathUtils.js";
import RouteRedirect from "./RouteRedirect.js";
import StatusResponse from "./StatusResponse.js";
import { formatIssues, runSchema } from "./schemaUtils.js";
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
  RouteMap,
  RouteMiddleware,
  RouteModule,
  RouteName,
  RouteOf,
  RouteParamValues,
  Router,
  RouterAccessibilityContext,
  RouterAccessibilityDocumentLike,
  RouterDehydratedState,
  RouterLoadResult,
  RouterMatch,
  RouterOptions,
  SearchOf,
  StandardSchemaIssue,
  WarmFn,
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

  for (const [key, value] of searchParams.entries()) {
    rawSearch[key] = value;
  }

  return rawSearch;
}

/** The `data` payload of the `StatusResponse` thrown on search failure. */
export interface SearchValidationFailure {
  readonly issues: ReadonlyArray<StandardSchemaIssue>;
  readonly message: string;
}

function validateSearch<TRoute extends AnyRoute>(
  route: TRoute,
  url: URL,
): SearchOf<TRoute> {
  if (!route.search) {
    return {} as SearchOf<TRoute>;
  }

  const rawSearch = readSearchParams(url.searchParams);
  const outcome = runSchema(
    route.search,
    rawSearch,
    `Route '${route.url}' search`,
  );

  if (outcome.issues) {
    throw new StatusResponse<SearchValidationFailure>(400, {
      issues: outcome.issues,
      message: `Search param validation failed: ${formatIssues(outcome.issues)}`,
    });
  }

  return outcome.value as SearchOf<TRoute>;
}

/**
 * Validate raw path params against the route's optional `params` schema.
 *
 * Returns `null` when the schema rejects the values: the URL does not
 * identify this route, so matching falls through to the next candidate
 * (and ultimately the not-found route) — a 404, not an error.
 */
function validateParams<TRoute extends AnyRoute>(
  route: TRoute,
  rawParams: Record<string, string>,
): ParamsOf<TRoute> | null {
  if (!route.params) {
    return rawParams as ParamsOf<TRoute>;
  }

  const outcome = runSchema(
    route.params,
    rawParams,
    `Route '${route.url}' params`,
  );

  if (outcome.issues) {
    return null;
  }

  return outcome.value as ParamsOf<TRoute>;
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
          ...createRouteCodec(transformedRoute.url, transformedRoute.params),
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
        params as Readonly<Record<string, unknown>>,
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
 * Scheduled loads (navigate, warm, adapter pop) run asynchronously.  When a
 * newer navigation supersedes an in-flight one, the earlier load is aborted and
 * its rejection is harmless.  Attaching this handler prevents an unhandled
 * promise rejection without swallowing errors that matter — the active load's
 * result is always awaited directly where it is needed.
 */
function ignoreScheduledLoadError(_error: unknown): void {}

/**
 * Rejections from async warm hooks that carry control flow rather than a
 * side-effect failure: a runtime redirect or a typed status.  They receive
 * the same meaning as their synchronous counterparts, applied late.
 */
type ScheduledControlFlowError =
  | RouteRedirect
  | StatusResponse<unknown>
  | Response;

interface ScheduledControlFlow {
  /** Latch — only the first control-flow signal of a load is applied. */
  applied: boolean;
  apply(error: ScheduledControlFlowError): void;
}

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
  const pendingWarmups = new Map<string, Promise<void>>();
  const warmedLoads = new Map<string, ResolvedLoadData<TRoutes, TNotFound>>();
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
    scheduledControlFlow: ScheduledControlFlow,
  ): Promise<ResolvedLoadData<TRoutes, TNotFound>> {
    const nextRoute = currentMatch?.route;

    // A rejection from an async warm hook is honoured when it carries
    // control flow (a runtime redirect or a typed status): the first one wins
    // and is applied late by the caller's guard.  Any other rejection is an
    // ordinary side-effect failure and is deliberately ignored — warm
    // never blocks rendering.
    const handleScheduledRejection = (thrownError: unknown): void => {
      if (
        scheduledControlFlow.applied ||
        !(
          thrownError instanceof RouteRedirect ||
          thrownError instanceof StatusResponse ||
          thrownError instanceof Response
        )
      ) {
        ignoreScheduledLoadError(thrownError);
        return;
      }

      scheduledControlFlow.applied = true;

      try {
        scheduledControlFlow.apply(thrownError);
      } catch (applyError) {
        // Applying late control flow must never surface as an unhandled
        // rejection (e.g. an adapter that cannot navigate).
        ignoreScheduledLoadError(applyError);
      }
    };

    // Fire warm hooks as fire-and-forget side effects.
    // Wrapper warms run for all wrappers (no caching/reuse).
    // Route warm runs if defined. None block rendering.
    if (nextRoute) {
      // Wrappers are shared across routes and typed as RouteParamValues, so
      // they receive the raw string params extracted from the URL — a route's
      // params schema only transforms what the route's own hooks receive.
      const rawWrapperParams = (
        currentMatch ? (matchPath(nextRoute.url, currentMatch.url) ?? {}) : {}
      ) as RouteParamValues;

      for (const currentWrapper of nextRoute.wrappers) {
        if (currentWrapper.warm) {
          void Promise.resolve(
            currentWrapper.warm(rawWrapperParams, { signal }),
          ).catch(handleScheduledRejection);
        }
      }

      if (nextRoute.warm && currentMatch) {
        void Promise.resolve(
          nextRoute.warm(currentMatch.params, currentMatch.search, {
            signal,
          }),
        ).catch(handleScheduledRejection);
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

  const warmHref = async (
    input: string | URL,
    redirectDepth = 0,
  ): Promise<void> => {
    if (redirectDepth > 10) {
      throw new Error("Too many redirects during router.warm().");
    }

    const url = buildUrl(input);
    const currentMatch = match(url);
    const redirectMatch = currentMatch as unknown;

    if (isRedirectMatch(redirectMatch)) {
      await warmHref(redirectMatch.redirectTo, redirectDepth + 1);
      return;
    }

    const href = toHref(url);

    if (warmedLoads.has(href)) {
      return;
    }

    const pendingWarmup = pendingWarmups.get(href);

    if (pendingWarmup) {
      await pendingWarmup;
      return;
    }

    const warmPromise = (async () => {
      // Same stash discipline as navigation loads: a rejection arriving
      // before the entry is cached would otherwise miss the cache and be
      // dropped by the location guard.
      const lateControlFlow: {
        pending: ScheduledControlFlowError | null;
        cached: boolean;
      } = { pending: null, cached: false };

      const applyWarmControlFlow = (
        thrownError: ScheduledControlFlowError,
      ): void => {
        applyLateWarmControlFlow(thrownError, {
          href,
          url,
          currentMatch,
          redirectDepth,
        });
      };

      const scheduledControlFlow: ScheduledControlFlow = {
        applied: false,
        apply: (thrownError) => {
          if (!lateControlFlow.cached) {
            lateControlFlow.pending = thrownError;

            return;
          }

          applyWarmControlFlow(thrownError);
        },
      };

      try {
        const warmedLoad = await resolveLoadData(
          currentMatch,
          createIdleSignal(),
          scheduledControlFlow,
        );

        warmedLoads.set(href, warmedLoad);
        lateControlFlow.cached = true;

        const pendingControlFlow = lateControlFlow.pending;

        if (pendingControlFlow) {
          lateControlFlow.pending = null;
          applyWarmControlFlow(pendingControlFlow);
        }
      } catch (thrownError) {
        scheduledControlFlow.applied = true;
        lateControlFlow.cached = true;
        lateControlFlow.pending = null;

        if (thrownError instanceof RouteRedirect) {
          await warmHref(thrownError.to, redirectDepth + 1);
          return;
        }

        throw thrownError;
      } finally {
        pendingWarmups.delete(href);
      }
    })();

    pendingWarmups.set(href, warmPromise);
    await warmPromise;
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

  /**
   * Apply a control-flow rejection (redirect / status) that arrived from an
   * async warm hook after its navigation already committed.  Warm is
   * fire-and-forget, so a late arrival is expected: the page may render
   * briefly before the redirect or error status lands.  The guards drop the
   * rejection when the load was superseded or the user moved on.
   */
  function applyLateNavigationControlFlow(
    thrownError: ScheduledControlFlowError,
    context: {
      url: URL;
      currentMatch: RouterMatch<TRoutes, TNotFound> | null;
      signal: AbortSignal;
      redirectDepth: number;
      shouldSyncAdapter: boolean;
      mode: NavigationMode;
    },
  ): void {
    if (
      context.signal.aborted ||
      store.getState().location.href !== toHref(context.url)
    ) {
      return;
    }

    if (thrownError instanceof RouteRedirect) {
      void performLoad(
        thrownError.to,
        context.redirectDepth + 1,
        context.shouldSyncAdapter,
        context.mode,
      )
        .then((redirectedResult) => {
          if (
            context.shouldSyncAdapter &&
            adapter &&
            toHref(adapter.getLocation()) !== redirectedResult.location.href
          ) {
            syncAdapterLocation(redirectedResult.location.href, {
              replace: true,
            });
          }
        })
        .catch(ignoreScheduledLoadError);

      return;
    }

    const status = getErrorStatus(thrownError);

    currentLoadResult = createLoadResult<TRoutes, TNotFound>({
      error: thrownError,
      location: store.commit(context.url, context.currentMatch, status)
        .location,
      match: context.currentMatch,
      status,
    });
  }

  /**
   * Apply a control-flow rejection from an async warm hook that ran for a
   * hover/manual warm.  A still-cached entry absorbs the outcome so the
   * eventual navigation observes it; an entry already consumed by a
   * navigation to that href applies live; otherwise the user went elsewhere
   * and the rejection is dropped.
   */
  function applyLateWarmControlFlow(
    thrownError: ScheduledControlFlowError,
    context: {
      href: string;
      url: URL;
      currentMatch: RouterMatch<TRoutes, TNotFound> | null;
      redirectDepth: number;
    },
  ): void {
    if (thrownError instanceof RouteRedirect) {
      if (warmedLoads.delete(context.href)) {
        void warmHref(thrownError.to, context.redirectDepth + 1).catch(
          ignoreScheduledLoadError,
        );

        return;
      }

      if (store.getState().location.href === context.href) {
        void performLoad(
          thrownError.to,
          context.redirectDepth + 1,
          true,
          "push",
        )
          .then((redirectedResult) => {
            if (
              adapter &&
              toHref(adapter.getLocation()) !== redirectedResult.location.href
            ) {
              syncAdapterLocation(redirectedResult.location.href, {
                replace: true,
              });
            }
          })
          .catch(ignoreScheduledLoadError);
      }

      return;
    }

    const status = getErrorStatus(thrownError);
    const cachedLoad = warmedLoads.get(context.href);

    if (cachedLoad) {
      warmedLoads.set(context.href, { ...cachedLoad, status });

      return;
    }

    if (store.getState().location.href === context.href) {
      currentLoadResult = createLoadResult<TRoutes, TNotFound>({
        error: thrownError,
        location: store.commit(context.url, context.currentMatch, status)
          .location,
        match: context.currentMatch,
        status,
      });
    }
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
    /** Ids of the blockers whose isActive() intercepted this navigation. */
    blockedBy: ReadonlySet<string>;
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

    if (!adapter) {
      throw new Error(
        "router.navigate() requires a platform adapter. Construct the router " +
          "with { adapter } — an adapterless router only matches and builds " +
          "URLs (match(), buildPath(), load()).",
      );
    }

    const activeBlockerIds = getActiveBlockerIds();

    if (activeBlockerIds.size > 0) {
      pendingNavigation = {
        href: intent.href,
        replace: replace ?? false,
        blockedBy: activeBlockerIds,
        resolve: () => {
          pendingNavigation = null;
          notifyBlockerState();
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
      notifyBlockerState();

      return intent;
    }

    saveScrollPosition();
    syncAdapterLocation(intent.href, replace ? { replace: true } : undefined);
    void performLoad(intent.href, 0, true, replace ? "pop" : "push").catch(
      ignoreScheduledLoadError,
    );

    return intent;
  }) as NavigateFn<TRoutes>;

  const blockers = new Map<string, () => boolean>();
  const blockerSubject = createSubject<"idle" | "blocked">();
  let blockerIdCounter = 0;

  function getActiveBlockerIds(): Set<string> {
    const activeIds = new Set<string>();

    for (const [id, isActive] of blockers.entries()) {
      if (isActive()) {
        activeIds.add(id);
      }
    }

    return activeIds;
  }

  function notifyBlockerState(): void {
    blockerSubject.next(pendingNavigation ? "blocked" : "idle");
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

    for (const [key, value] of currentUrl.searchParams.entries()) {
      currentSearch[key] = value;
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

    if (!adapter) {
      throw new Error(
        "router.setSearchParams() requires a platform adapter. Construct the " +
          "router with { adapter } — an adapterless router only matches and " +
          "builds URLs (match(), buildPath(), load()).",
      );
    }

    syncAdapterLocation(href, replace ? { replace: true } : undefined);
    void performLoad(href, 0, true, replace ? "pop" : "push").catch(
      ignoreScheduledLoadError,
    );
  }

  const warm: WarmFn<TRoutes> = ((
    name: RouteName<TRoutes>,
    ...args: unknown[]
  ) => {
    const intent = createIntent(
      resolvedRoutes,
      name,
      args as unknown as PathBuildArgs<RouteOf<TRoutes, typeof name>>,
    );

    return warmHref(intent.href);
  }) as WarmFn<TRoutes>;

  const match = (
    input: string | URL,
  ): RouterMatch<TRoutes, TNotFound> | null => {
    const url = buildUrl(input);

    for (const [name, currentRoute] of sortedRoutes) {
      const rawParams = matchPath(currentRoute.url, url);

      if (!rawParams) {
        continue;
      }

      const params = validateParams(currentRoute, rawParams);

      if (params === null) {
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

    // Matching can throw (a search schema rejecting the query string). Commit
    // the failure as an error result — a shareable URL with a bad query is a
    // 400 response, not an unhandled rejection.
    let currentMatch: RouterMatch<TRoutes, TNotFound> | null;

    try {
      currentMatch = match(url);
    } catch (thrownError) {
      const status = getErrorStatus(thrownError);
      let result!: RouterLoadResult<TRoutes, TNotFound>;

      await runNavigationUpdate(mode, () => {
        result = createLoadResult<TRoutes, TNotFound>({
          error: thrownError,
          location: store.commit(url, null, status).location,
          match: null,
          status,
        });

        currentLoadResult = result;
      });
      scheduleAccessibilityEffects(result, mode);

      return result;
    }

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

    // A control-flow rejection can land while this load is still in flight
    // (an already-settled async hook rejects on the next microtask).  Stash it
    // until the load commits, then apply — otherwise the location-currency
    // guard would see the previous location and wrongly drop it.
    const lateControlFlow: {
      pending: ScheduledControlFlowError | null;
      committed: boolean;
    } = { pending: null, committed: false };

    const applyNavigationControlFlow = (
      thrownError: ScheduledControlFlowError,
    ): void => {
      applyLateNavigationControlFlow(thrownError, {
        url,
        currentMatch,
        signal: abortController.signal,
        redirectDepth,
        shouldSyncAdapter,
        mode,
      });
    };

    const scheduledControlFlow: ScheduledControlFlow = {
      applied: false,
      apply: (thrownError) => {
        if (!lateControlFlow.committed) {
          lateControlFlow.pending = thrownError;

          return;
        }

        applyNavigationControlFlow(thrownError);
      },
    };

    try {
      const pendingWarmup = pendingWarmups.get(href);

      if (pendingWarmup) {
        await pendingWarmup.catch(ignoreScheduledLoadError);
      }

      if (abortController.signal.aborted) {
        throw new Error("aborted");
      }

      const warmedLoad = warmedLoads.get(href);
      const resolvedLoad =
        warmedLoad ??
        (await resolveLoadData(
          currentMatch,
          abortController.signal,
          scheduledControlFlow,
        ));

      warmedLoads.delete(href);

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
        warmedLoads.clear();
      });
      scheduleAccessibilityEffects(result, mode);

      lateControlFlow.committed = true;

      const pendingControlFlow = lateControlFlow.pending;

      if (pendingControlFlow) {
        lateControlFlow.pending = null;
        applyNavigationControlFlow(pendingControlFlow);
      }

      return result;
    } catch (thrownError) {
      // A synchronous throw already carried the load's control flow — a late
      // async rejection must not apply on top of it.
      scheduledControlFlow.applied = true;
      lateControlFlow.committed = true;
      lateControlFlow.pending = null;

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
        params: result.match.params as RouteParamValues,
        search: result.match.search,
      }),
    );
  };

  const router: Router<TRoutes, TNotFound> = {
    adapter,
    routes: resolvedRoutes,
    notFound: options?.notFound as TNotFound,
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
    warm,
    block(isActive: () => boolean) {
      blockerIdCounter += 1;

      const id = `blocker-${blockerIdCounter}`;

      blockers.set(id, isActive);

      // Every action is scoped to this registration: a handle whose blocker
      // did not intercept the pending navigation reports idle and cannot
      // proceed, cancel, or discard it.
      const isBlockedByThis = (): boolean =>
        pendingNavigation?.blockedBy.has(id) ?? false;

      return {
        get state() {
          return isBlockedByThis() ? ("blocked" as const) : ("idle" as const);
        },
        proceed() {
          if (isBlockedByThis()) {
            pendingNavigation?.resolve();
          }
        },
        cancel() {
          if (isBlockedByThis()) {
            pendingNavigation = null;
            notifyBlockerState();
          }
        },
        subscribe(listener: (state: "idle" | "blocked") => void) {
          return blockerSubject.subscribe(() => {
            listener(isBlockedByThis() ? "blocked" : "idle");
          });
        },
        dispose() {
          blockers.delete(id);

          if (isBlockedByThis()) {
            pendingNavigation = null;
            notifyBlockerState();
          }
        },
      };
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

  // The store stays reachable on the concrete object for this package's own
  // tests, but is not part of the public Router contract.
  return Object.assign(router, { store });
}
