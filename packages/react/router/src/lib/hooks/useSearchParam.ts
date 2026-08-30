import type { SearchParamKey } from "@canonical/router-core";
import { useCallback, useSyncExternalStore } from "react";
import type { RegisteredRouteMap } from "../register.js";
import useRouter from "./useRouter.js";

/**
 * Subscribe to a single search parameter by name.
 *
 * The hook returns the current string value for `key`, or `null` when the
 * parameter is absent. Only updates for that specific key trigger rerenders,
 * which makes it cheaper than subscribing to the full location object.
 *
 * `key` is narrowed to the search-param keys declared by the registered route
 * map. Apps with no `RouterRegister` declaration fall back to any `string`.
 *
 * @param key - The query-string parameter name to observe.
 */
export default function useSearchParam(
  key: SearchParamKey<RegisteredRouteMap>,
): string | null {
  const router = useRouter();

  const getSnapshot = useCallback(
    () => router.getState().location.searchParams.get(key),
    [router, key],
  );

  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      router.subscribeToSearchParam(key, () => onStoreChange()),
    [router, key],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
