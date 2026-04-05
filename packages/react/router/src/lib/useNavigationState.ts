import type {
  AnyRoute,
  RouteMap,
  RouterNavigationState,
} from "@canonical/router-core";
import { useSyncExternalStore } from "react";
import useRouter from "./useRouter.js";

export default function useNavigationState<
  TRoutes extends RouteMap,
  TNotFound extends AnyRoute | undefined = undefined,
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
