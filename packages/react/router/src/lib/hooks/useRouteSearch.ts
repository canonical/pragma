import type { AnyRoute, SearchOf } from "@canonical/router-core";
import { useSyncExternalStore } from "react";
import useRouter from "./useRouter.js";

const EMPTY_SEARCH: Readonly<Record<string, never>> = Object.freeze({});

/**
 * Return the current match's validated search data, typed by the given route.
 *
 * The hook subscribes to router state and rerenders when the current match's
 * search object changes (each navigation produces a new match, and with it a
 * new search object). Routes without a `search` schema — and unmatched
 * states — yield a frozen empty object, mirroring core matching semantics.
 *
 * The `route` argument is a type witness: by passing it the caller asserts
 * the hook runs under that route's subtree (its `component`/`content` or
 * `wrappers`). The current match's search is returned cast to the argument
 * route's search type; route identity is not verified at runtime.
 */
export default function useRouteSearch<TRoute extends AnyRoute>(
  // biome-ignore lint/correctness/noUnusedFunctionParameters: type witness — carries the route's search generics into the return type
  route: TRoute,
): SearchOf<TRoute> {
  const router = useRouter();

  const getSnapshot = () =>
    (router.getState().match?.search ?? EMPTY_SEARCH) as SearchOf<TRoute>;

  return useSyncExternalStore(router.subscribe, getSnapshot, getSnapshot);
}
