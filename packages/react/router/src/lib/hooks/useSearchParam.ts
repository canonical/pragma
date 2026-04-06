import type { AnyRoute, RouteMap } from "@canonical/router-core";
import { useSyncExternalStore } from "react";
import type { RegisteredNotFound, RegisteredRouteMap } from "../register.js";
import useRouter from "./useRouter.js";

/**
 * Subscribe to a single search parameter by name.
 *
 * The hook returns the current string value for `key`, or `null` when the
 * parameter is absent. Only updates for that specific key trigger rerenders,
 * which makes it cheaper than subscribing to the full location object.
 *
 * @param key - The query-string parameter name to observe.
 */
export default function useSearchParam<
  TRoutes extends RouteMap = RegisteredRouteMap,
  TNotFound extends AnyRoute | undefined = RegisteredNotFound,
>(key: string): string | null {
  const router = useRouter<TRoutes, TNotFound>();

  const getSnapshot = (): string | null => {
    return router.getState().location.searchParams.get(key);
  };

  return useSyncExternalStore(
    (onStoreChange) => {
      return router.subscribeToSearchParam(key, () => {
        onStoreChange();
      });
    },
    getSnapshot,
    getSnapshot,
  );
}
