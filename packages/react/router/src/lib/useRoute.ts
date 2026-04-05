import type {
  AnyRoute,
  RouteMap,
  RouterLocationKey,
  RouterLocationState,
  TrackedLocation,
} from "@canonical/router-core";
import { useRef, useSyncExternalStore } from "react";
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

export default function useRoute<
  TRoutes extends RouteMap,
  TNotFound extends AnyRoute | undefined = undefined,
>(): TrackedLocation<RouterLocationState> {
  const router = useRouter<TRoutes, TNotFound>();
  const trackedKeysRef = useRef<Set<RouterLocationKey>>(new Set());
  const previousLocationRef = useRef(router.getState().location);
  const versionRef = useRef(0);
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
