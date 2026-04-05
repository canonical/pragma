import type { AnyRoute, RouteMap } from "@canonical/router-core";
import { useSyncExternalStore } from "react";
import useRouter from "./useRouter.js";

export default function useSearchParam<
  TRoutes extends RouteMap,
  TNotFound extends AnyRoute | undefined = undefined,
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
