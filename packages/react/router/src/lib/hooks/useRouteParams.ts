import type { AnyRoute, ParamsOf } from "@canonical/router-core";
import { useSyncExternalStore } from "react";
import useRouter from "./useRouter.js";

const EMPTY_PARAMS: Readonly<Record<string, never>> = Object.freeze({});

/**
 * Return the current match's params, typed by the given route.
 *
 * The hook subscribes to router state and rerenders when the current match's
 * params object changes (each navigation produces a new match, and with it a
 * new params object). When no route is matched it returns a frozen empty
 * object.
 *
 * The `route` argument is a type witness: by passing it the caller asserts
 * the hook runs under that route's subtree (its `component`/`content` or
 * `wrappers`). The current match's params are returned cast to the argument
 * route's param type; route identity is not verified at runtime.
 */
export default function useRouteParams<TRoute extends AnyRoute>(
  // biome-ignore lint/correctness/noUnusedFunctionParameters: type witness — carries the route's param generics into the return type
  route: TRoute,
): ParamsOf<TRoute> {
  const router = useRouter();

  const getSnapshot = () =>
    (router.getState().match?.params ?? EMPTY_PARAMS) as ParamsOf<TRoute>;

  return useSyncExternalStore(router.subscribe, getSnapshot, getSnapshot);
}
