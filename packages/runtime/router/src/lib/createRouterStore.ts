import buildUrl from "./buildUrl.js";
import createSubject from "./createSubject.js";
import createTrackedLocation from "./createTrackedLocation.js";
import type {
  AnyRoute,
  NavigationStateChange,
  RouteMap,
  RouterLocationChange,
  RouterLocationKey,
  RouterLocationState,
  RouterMatch,
  RouterSnapshot,
  RouterState,
  RouterStore,
  SearchParamChange,
} from "./types.js";

function createLocationState(url: URL, status: number): RouterLocationState {
  return {
    hash: url.hash,
    href: `${url.pathname}${url.search}${url.hash}`,
    pathname: url.pathname,
    searchParams: new URLSearchParams(url.searchParams),
    status,
    url,
  };
}

function areSearchParamsEqual(
  left: URLSearchParams,
  right: URLSearchParams,
): boolean {
  return left.toString() === right.toString();
}

function getChangedLocationKeys(
  previousLocation: RouterLocationState,
  nextLocation: RouterLocationState,
): RouterLocationKey[] {
  const changed: RouterLocationKey[] = [];

  if (previousLocation.hash !== nextLocation.hash) {
    changed.push("hash");
  }

  if (previousLocation.href !== nextLocation.href) {
    changed.push("href");
  }

  if (previousLocation.pathname !== nextLocation.pathname) {
    changed.push("pathname");
  }

  if (
    !areSearchParamsEqual(
      previousLocation.searchParams,
      nextLocation.searchParams,
    )
  ) {
    changed.push("searchParams");
  }

  if (previousLocation.status !== nextLocation.status) {
    changed.push("status");
  }

  if (previousLocation.url.href !== nextLocation.url.href) {
    changed.push("url");
  }

  return changed;
}

function getSearchParamKeys(searchParams: URLSearchParams): string[] {
  return [...new Set(searchParams.keys())];
}

function areSearchParamValuesEqual(
  left: URLSearchParams,
  right: URLSearchParams,
  key: string,
): boolean {
  return left.getAll(key).join("\u0000") === right.getAll(key).join("\u0000");
}

/** Create the external mutable store that backs router subscriptions. */
export default function createRouterStore<
  TRoutes extends RouteMap,
  TNotFound extends AnyRoute | undefined = undefined,
>(
  resolveMatch: (input: string | URL) => RouterMatch<TRoutes, TNotFound> | null,
  initialUrl: string | URL = "/",
): RouterStore<TRoutes, TNotFound> {
  const initialResolvedUrl = buildUrl(initialUrl);
  const initialMatch = resolveMatch(initialResolvedUrl);
  let state: RouterState<TRoutes, TNotFound> = {
    location: createLocationState(
      initialResolvedUrl,
      initialMatch?.status ?? 404,
    ),
    match: initialMatch,
    navigation: {
      state: "idle",
    },
  };

  const subjects = {
    location: createSubject<RouterLocationChange<TRoutes, TNotFound>>(),
    navigation: createSubject<NavigationStateChange<TRoutes, TNotFound>>(),
    search: createSubject<SearchParamChange<TRoutes, TNotFound>>(),
    state: createSubject<RouterSnapshot<TRoutes, TNotFound>>(),
  };

  function getSnapshot(): RouterSnapshot<TRoutes, TNotFound> {
    return {
      ...state.location,
      match: state.match,
      navigationState: state.navigation.state,
    };
  }

  function publishState(): void {
    subjects.state.next(getSnapshot());
  }

  function publishSearchParamChanges(
    previousLocation: RouterLocationState,
    nextLocation: RouterLocationState,
  ): void {
    const keys = new Set([
      ...getSearchParamKeys(previousLocation.searchParams),
      ...getSearchParamKeys(nextLocation.searchParams),
    ]);

    for (const key of keys) {
      if (
        areSearchParamValuesEqual(
          previousLocation.searchParams,
          nextLocation.searchParams,
          key,
        )
      ) {
        continue;
      }

      subjects.search.next({
        key,
        location: nextLocation,
        match: state.match,
        previousValue: previousLocation.searchParams.get(key),
        value: nextLocation.searchParams.get(key),
      });
    }
  }

  function commit(
    input: string | URL,
    match: RouterMatch<TRoutes, TNotFound> | null,
    status = match?.status ?? 404,
  ): RouterState<TRoutes, TNotFound> {
    const nextUrl = buildUrl(input);
    const previousLocation = state.location;
    const nextLocation = createLocationState(nextUrl, status);
    const changed = getChangedLocationKeys(previousLocation, nextLocation);

    state = {
      ...state,
      location: nextLocation,
      match,
    };

    if (changed.length === 0) {
      return state;
    }

    subjects.location.next({
      changed,
      location: nextLocation,
      match,
    });
    publishSearchParamChanges(previousLocation, nextLocation);
    publishState();

    return state;
  }

  return {
    commit,
    getSnapshot,
    getState() {
      return state;
    },
    getTrackedLocation(onAccess) {
      return createTrackedLocation(state.location, onAccess);
    },
    setLocation(input) {
      const nextUrl = buildUrl(input);
      const nextMatch = resolveMatch(nextUrl);
      return commit(nextUrl, nextMatch, nextMatch?.status ?? 404);
    },
    setNavigationState(nextNavigationState) {
      const previousState = state.navigation.state;

      if (previousState === nextNavigationState) {
        return state;
      }

      state = {
        ...state,
        navigation: {
          state: nextNavigationState,
        },
      };

      subjects.navigation.next({
        current: state,
        previousState,
        state: nextNavigationState,
      });
      publishState();

      return state;
    },
    subscribe(listener) {
      return subjects.state.subscribe(listener);
    },
    subscribeToNavigation(listener) {
      return subjects.navigation.subscribe((change) => {
        listener(change.state, change.previousState);
      });
    },
    subscribeToSearchParam(key, listener) {
      return subjects.search.subscribe((change) => {
        if (change.key !== key) {
          return;
        }

        listener(change.value, change.previousValue);
      });
    },
  };
}
