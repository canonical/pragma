import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { UseFacetsProps, UseFacetsResult } from "./types.js";

/**
 * The facets of the result, and nothing else of the state, read two ways.
 * Those answering the applied query are null while no result answers it —
 * before the first page, while another query is pending over rows an earlier
 * one produced — so a control never shows counts or ranges computed for
 * another restriction. The latest are whatever the latest result answered,
 * kept until a newer result lands — while a query is pending, or after it
 * fails, as the rows on screen are — so what they list does not vanish
 * under the edit that made the query. The provider keeps a slice's identity
 * while the slice stands, so a page turning keeps the facets, and a result
 * arriving for the same query re-renders only when its facets move.
 */
export default function useFacets({
  provider,
}: UseFacetsProps): UseFacetsResult {
  const { state } = provider;
  const readAnswered = useCallback((): UseFacetsResult["answered"] => {
    const { slice, result } = state.get();
    return result.provenance?.slice === slice ? result.facets : null;
  }, [state]);
  const readLatest = useCallback(
    (): UseFacetsResult["latest"] => state.get().result.facets,
    [state],
  );
  const answered = useSyncExternalStore(
    state.subscribe,
    readAnswered,
    readAnswered,
  );
  const latest = useSyncExternalStore(state.subscribe, readLatest, readLatest);
  return useMemo(() => ({ answered, latest }), [answered, latest]);
}
