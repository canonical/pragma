import type {
  AnyRoute,
  RouteMap,
  RouterNavigationState,
} from "@canonical/router-core";
import { useSyncExternalStore } from "react";
import type { RegisteredNotFound, RegisteredRouteMap } from "../register.js";
import useRouter from "./useRouter.js";

/**
 * Return the router's current navigation lifecycle state.
 *
 * This hook subscribes only to the navigation channel, so callers rerender when
 * navigation enters states such as loading, idle, or submitting without being
 * coupled to other router state changes.
 */
export default function useNavigationState<
  TRoutes extends RouteMap = RegisteredRouteMap,
  TNotFound extends AnyRoute | undefined = RegisteredNotFound,
>(): RouterNavigationState {
  const router = useRouter<TRoutes, TNotFound>();

  const getSnapshot = (): RouterNavigationState => {
    return router.getState().navigation.state;
  };

  return useSyncExternalStore(
    (onStoreChange) => {
      return router.subscribeToNavigation(() => {
        onStoreChange();
      });
    },
    getSnapshot,
    getSnapshot,
  );
}
