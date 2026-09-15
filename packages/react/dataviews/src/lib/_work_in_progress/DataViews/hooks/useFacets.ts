import { useCallback, useSyncExternalStore } from "react";
import type { UseFacetsProps, UseFacetsResult } from "./types.js";

/**
 * The facets of the result that answers the applied query, and nothing else
 * of the state: null while no result answers it — before the first page,
 * while another query is pending over rows an earlier one produced — so a
 * control never shows counts or ranges computed for another restriction.
 * The provider keeps a slice's identity while the slice stands, so a page
 * turning keeps the facets, and a result arriving for the same query
 * re-renders only when its facets move.
 */
export default function useFacets({
  provider,
}: UseFacetsProps): UseFacetsResult {
  const { state } = provider;
  const readFacets = useCallback((): UseFacetsResult => {
    const { slice, result } = state.get();
    return result.provenance?.slice === slice ? result.facets : null;
  }, [state]);
  return useSyncExternalStore(state.subscribe, readFacets, readFacets);
}
