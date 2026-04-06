import type {
  AnyRoute,
  RouteMap,
  RouterNavigationState,
} from "@canonical/router-core";
import { useCallback, useSyncExternalStore } from "react";
import type { RegisteredNotFound, RegisteredRouteMap } from "../register.js";
import useRouter from "./useRouter.js";

/**
 * Return the router's current navigation lifecycle state.
 *
 * This hook subscribes only to the navigation channel, so callers rerender when
 * navigation transitions between `"idle"` and `"loading"` without being coupled
 * to other router state changes.
 */
export default function useNavigationState<
  TRoutes extends RouteMap = RegisteredRouteMap,
  TNotFound extends AnyRoute | undefined = RegisteredNotFound,
>(): RouterNavigationState {
  const router = useRouter<TRoutes, TNotFound>();

  const getSnapshot = useCallback(
    () => router.getState().navigation.state,
    [router],
  );

  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      router.subscribeToNavigation(() => onStoreChange()),
    [router],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
