import type { SortTerm } from "@canonical/dataviews-core";
import { areListsEqual } from "@canonical/dataviews-core/bindings";
import { useCallback, useRef, useSyncExternalStore } from "react";
import { areSortTermsEqual } from "../../../utils/index.js";
import type { UseAppliedSortProps, UseAppliedSortResult } from "./types.js";

/**
 * The applied sort terms, and nothing else of the state: the subscription
 * is the provider's state channel, but the snapshot is the ordering alone,
 * held at one identity while it reads the same, so a result arriving or a
 * page turning re-renders nothing that lists the terms.
 */
export default function useAppliedSort({
  provider,
}: UseAppliedSortProps): UseAppliedSortResult {
  const { state } = provider;
  const held = useRef<readonly SortTerm[] | null>(null);
  const readSort = useCallback(() => {
    const sort = state.get().slice.sort;
    const previous = held.current;
    if (previous !== null && areListsEqual(previous, sort, areSortTermsEqual)) {
      return previous;
    }
    // Written while React reads the snapshot: the ordering held is the
    // store's latest either way, so a render React discards changes nothing.
    held.current = sort;
    return sort;
  }, [state]);
  return useSyncExternalStore(state.subscribe, readSort, readSort);
}
