import { useCallback, useSyncExternalStore } from "react";
import type { UseAppliedSearchProps, UseAppliedSearchResult } from "./types.js";

/**
 * The applied search text, and nothing else of the state: the subscription
 * is the provider's state channel, but the snapshot is the search alone, so
 * a result arriving or a page turning re-renders no search box.
 */
export default function useAppliedSearch({
  provider,
}: UseAppliedSearchProps): UseAppliedSearchResult {
  const { state } = provider;
  const readSearch = useCallback(() => state.get().slice.search ?? "", [state]);
  return useSyncExternalStore(state.subscribe, readSearch, readSearch);
}
