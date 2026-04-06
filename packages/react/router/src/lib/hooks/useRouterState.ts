import type { AnyRoute, RouteMap, RouterState } from "@canonical/router-core";
import { useRef, useSyncExternalStore } from "react";
import type { RegisteredNotFound, RegisteredRouteMap } from "../register.js";
import type { UseRouterStateOptions } from "./types.js";
import useRouter from "./useRouter.js";

function identity<TValue>(value: TValue): TValue {
  return value;
}

/**
 * Subscribe to the router state or to a selected slice of it.
 *
 * This is the power-user hook for advanced integrations that need direct access
 * to `match`, `location`, or other state derived from `router.getState()`. Pass
 * a selector to narrow the subscription, and optionally provide `isEqual` when
 * the selector returns structured values that should be compared semantically.
 */
export default function useRouterState<
  TRoutes extends RouteMap = RegisteredRouteMap,
  TNotFound extends AnyRoute | undefined = RegisteredNotFound,
>(): RouterState<TRoutes, TNotFound>;
export default function useRouterState<
  TRoutes extends RouteMap = RegisteredRouteMap,
  TNotFound extends AnyRoute | undefined = RegisteredNotFound,
  TSelected = RouterState<TRoutes, TNotFound>,
>(
  selector: (state: RouterState<TRoutes, TNotFound>) => TSelected,
  options?: UseRouterStateOptions<TSelected>,
): TSelected;
export default function useRouterState<
  TRoutes extends RouteMap = RegisteredRouteMap,
  TNotFound extends AnyRoute | undefined = RegisteredNotFound,
  TSelected = RouterState<TRoutes, TNotFound>,
>(
  selector?: (state: RouterState<TRoutes, TNotFound>) => TSelected,
  options: UseRouterStateOptions<TSelected> = {},
): TSelected {
  const router = useRouter<TRoutes, TNotFound>();
  const selectionRef = useRef<TSelected | null>(null);
  const hasSelectionRef = useRef(false);
  const select =
    selector ??
    (identity as (state: RouterState<TRoutes, TNotFound>) => TSelected);
  const isEqual = options.isEqual ?? Object.is;

  const getSnapshot = () => {
    const nextSelection = select(router.getState());

    if (
      hasSelectionRef.current &&
      selectionRef.current !== null &&
      isEqual(selectionRef.current, nextSelection)
    ) {
      return selectionRef.current;
    }

    hasSelectionRef.current = true;
    selectionRef.current = nextSelection;

    return nextSelection;
  };

  return useSyncExternalStore(router.subscribe, getSnapshot, getSnapshot);
}
