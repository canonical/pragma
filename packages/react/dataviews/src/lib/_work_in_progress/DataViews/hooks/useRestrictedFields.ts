import type { Slice } from "@canonical/dataviews-core";
import { useCallback, useRef, useSyncExternalStore } from "react";
import type {
  UseRestrictedFieldsProps,
  UseRestrictedFieldsResult,
} from "./types.js";

/** Whether two tallies hold the same fields with the same counts. */
const areTalliesEqual = (
  a: UseRestrictedFieldsResult,
  b: UseRestrictedFieldsResult,
): boolean =>
  a.size === b.size && [...a].every(([field, count]) => b.get(field) === count);

/**
 * The fields the applied query restricts, each with how many predicates it
 * holds, and nothing else of the state: held at one identity while it reads
 * the same, so a result arriving, a page turning or an edit to a bound that
 * stands re-renders nothing that places controls by it.
 *
 * @note Impure: holds the last tally and its slice on a ref while React reads
 * the snapshot, so an equal tally keeps its identity.
 */
export default function useRestrictedFields({
  provider,
}: UseRestrictedFieldsProps): UseRestrictedFieldsResult {
  const { state } = provider;
  const held = useRef<{
    readonly slice: Slice;
    readonly tally: UseRestrictedFieldsResult;
  } | null>(null);
  const readTally = useCallback((): UseRestrictedFieldsResult => {
    const { slice } = state.get();
    const previous = held.current;
    // The provider keeps a slice's identity while it stands: nothing to count.
    if (previous !== null && previous.slice === slice) {
      return previous.tally;
    }
    const counted = new Map<string, number>();
    for (const { field } of slice.filter) {
      counted.set(field, (counted.get(field) ?? 0) + 1);
    }
    const tally =
      previous !== null && areTalliesEqual(previous.tally, counted)
        ? previous.tally
        : counted;
    // Written while React reads the snapshot: the tally held is the store's
    // latest either way, so a render React discards changes nothing.
    held.current = { slice, tally };
    return tally;
  }, [state]);
  return useSyncExternalStore(state.subscribe, readTally, readTally);
}
