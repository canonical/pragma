import type {
  AnyRoute,
  RouteMap,
  RouterLocationKey,
  RouterLocationState,
  TrackedLocation,
} from "@canonical/router-core";
import { useRef, useSyncExternalStore } from "react";
import type { RegisteredNotFound, RegisteredRouteMap } from "../register.js";
import useRouter from "./useRouter.js";

function hasChanged(
  previousLocation: RouterLocationState,
  nextLocation: RouterLocationState,
  key: RouterLocationKey,
): boolean {
  if (key === "searchParams") {
    return (
      previousLocation.searchParams.toString() !==
      nextLocation.searchParams.toString()
    );
  }

  if (key === "url") {
    return previousLocation.url.href !== nextLocation.url.href;
  }

  return previousLocation[key] !== nextLocation[key];
}

/**
 * Return the current router location as a tracked proxy.
 *
 * Reading a location field such as `pathname`, `url`, or `searchParams`
 * subscribes the caller to just that field. The hook only triggers a rerender
 * when one of the accessed keys changes, while preserving a single stable proxy
 * instance across renders.
 */
export default function useRoute<
  TRoutes extends RouteMap = RegisteredRouteMap,
  TNotFound extends AnyRoute | undefined = RegisteredNotFound,
>(): TrackedLocation<RouterLocationState> {
  const router = useRouter<TRoutes, TNotFound>();
  const trackedKeysRef = useRef<Set<RouterLocationKey>>(new Set());
  const previousLocationRef = useRef(router.getState().location);
  const versionRef = useRef(0);
  // A Proxy is used instead of core's `createTrackedLocation` (which uses
  // `Object.defineProperty`) because the Proxy catch-all `get` trap intercepts
  // any string property access — including dynamic keys — and can filter out
  // symbol accesses.  The defineProperty approach only tracks keys known at
  // construction time.
  const trackedLocationRef = useRef<TrackedLocation<RouterLocationState>>(
    new Proxy({} as RouterLocationState, {
      get(_target, property) {
        if (typeof property !== "string") {
          return undefined;
        }

        trackedKeysRef.current.add(property as RouterLocationKey);

        return router.getState().location[
          property as keyof RouterLocationState
        ];
      },
    }) as TrackedLocation<RouterLocationState>,
  );

  trackedKeysRef.current = new Set();

  useSyncExternalStore(
    (onStoreChange) => {
      return router.subscribe(() => {
        const nextLocation = router.getState().location;
        const shouldNotify =
          trackedKeysRef.current.size === 0 ||
          Array.from(trackedKeysRef.current).some((key) => {
            return hasChanged(previousLocationRef.current, nextLocation, key);
          });

        if (!shouldNotify) {
          return;
        }

        previousLocationRef.current = nextLocation;
        versionRef.current += 1;
        onStoreChange();
      });
    },
    () => versionRef.current,
    () => versionRef.current,
  );

  return trackedLocationRef.current;
}
