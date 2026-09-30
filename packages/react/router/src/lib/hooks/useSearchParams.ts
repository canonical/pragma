import type { SearchParamKey } from "@canonical/router-core";
import { useRef, useSyncExternalStore } from "react";
import type { RegisteredRouteMap } from "../register.js";
import type { SearchParamValues } from "./types.js";
import useRouter from "./useRouter.js";

/** The search-param keys the registered route map declares. */
type RegisteredSearchParamKey = SearchParamKey<RegisteredRouteMap>;

type SearchParamSelectionState<TKeys extends readonly string[]> = {
  readonly keys: string;
  readonly value: SearchParamValues<TKeys>;
};

function haveSelectedValuesChanged<TKeys extends readonly string[]>(
  previous: SearchParamValues<TKeys>,
  next: SearchParamValues<TKeys>,
  keys: TKeys,
): boolean {
  return keys.some((key) => {
    const typedKey = key as TKeys[number];

    return previous[typedKey] !== next[typedKey];
  });
}

function createSelectedValues<TKeys extends readonly string[]>(
  keys: TKeys,
  searchParams: URLSearchParams,
): SearchParamValues<TKeys> {
  return Object.freeze(
    Object.fromEntries(
      keys.map((key) => [key, searchParams.get(key)]),
    ) as SearchParamValues<TKeys>,
  );
}

/**
 * Subscribe to all search params or to a fixed subset of keys.
 *
 * When called without arguments, the hook rerenders whenever the query string
 * changes and returns the current `URLSearchParams` object. When passed a key
 * list, it returns an object of key-to-value pairs and rerenders only when one
 * of the selected keys changes.
 *
 * The key list is narrowed to the search-param keys declared by the registered
 * route map. Apps with no `RouterRegister` declaration fall back to any
 * `string`.
 */
export default function useSearchParams(): URLSearchParams;
export default function useSearchParams<
  const TKeys extends
    readonly RegisteredSearchParamKey[] = readonly RegisteredSearchParamKey[],
>(keys: TKeys): SearchParamValues<TKeys>;
export default function useSearchParams<
  const TKeys extends
    readonly RegisteredSearchParamKey[] = readonly RegisteredSearchParamKey[],
>(keys?: TKeys): URLSearchParams | SearchParamValues<TKeys> {
  const router = useRouter();
  const fullSearchRef = useRef({
    search: router.getState().location.url.search,
    value: router.getState().location.searchParams,
  });
  const selectedSearchRef = useRef<SearchParamSelectionState<TKeys> | null>(
    null,
  );

  const getSnapshot = () => {
    const {
      searchParams,
      url: { search },
    } = router.getState().location;

    if (!keys) {
      if (fullSearchRef.current.search !== search) {
        fullSearchRef.current = {
          search,
          value: searchParams,
        };
      }

      return fullSearchRef.current.value;
    }

    const nextValues = createSelectedValues(keys, searchParams);
    const nextKeysSignature = keys.join("\u0000");
    const previous = selectedSearchRef.current;

    if (
      previous &&
      previous.keys === nextKeysSignature &&
      !haveSelectedValuesChanged(previous.value, nextValues, keys)
    ) {
      return previous.value;
    }

    selectedSearchRef.current = {
      keys: nextKeysSignature,
      value: nextValues,
    };

    return nextValues;
  };

  return useSyncExternalStore(router.subscribe, getSnapshot, getSnapshot);
}
