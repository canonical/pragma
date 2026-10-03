import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import type { TimelineUrlState } from "../types.js";
import mergeTimelineUrlParams from "../utils/mergeTimelineUrlParams.js";
import parseTimelineUrlParams from "../utils/parseTimelineUrlParams.js";
import type {
  UseTimelineUrlParamsProps,
  UseTimelineUrlParamsResult,
} from "./types.js";

const EMPTY_STATE: TimelineUrlState = { filters: {} };

const subscribeToNothing = () => () => {};

/** A canonical string for a state, so equal states compare equal. */
function serializeState(state: TimelineUrlState): string {
  return mergeTimelineUrlParams(new URLSearchParams(), state, "_").toString();
}

/**
 * Read and write Timeline's filters and sort order in the URL's query through
 * a `LocationQuery`. The first render, on the server too, already reflects
 * the URL. Changes made outside Timeline re-render with the new state and are
 * reported through `onParams`. Timeline's own writes are recognised by their
 * serialised state and are not reported.
 *
 * @note Impure: `write` navigates the location behind `locationQuery`.
 */
export default function useTimelineUrlParams({
  locationQuery,
  prefix = "tl",
  onParams,
}: UseTimelineUrlParamsProps): UseTimelineUrlParamsResult {
  // Latest-ref so an unstable onParams cannot resubscribe.
  const onParamsRef = useRef(onParams);
  useEffect(() => {
    onParamsRef.current = onParams;
  });

  // The serialised state Timeline last wrote or observed. A notification
  // that leaves it unchanged is Timeline's own write or a foreign param.
  const knownRef = useRef<string | undefined>(undefined);
  // The snapshot is cached by its serialisation so reads stay referentially
  // stable between changes, as useSyncExternalStore requires.
  const snapshotRef = useRef<{ key: string; state: TimelineUrlState }>(
    undefined,
  );

  const getSnapshot = useCallback((): TimelineUrlState => {
    if (!locationQuery) {
      return EMPTY_STATE;
    }
    const state = parseTimelineUrlParams(locationQuery.read(), prefix);
    const key = serializeState(state);
    if (snapshotRef.current?.key !== key) {
      snapshotRef.current = { key, state };
    }
    knownRef.current ??= key;
    return snapshotRef.current.state;
  }, [locationQuery, prefix]);

  const subscribe = useCallback(
    (notify: () => void) => {
      if (!locationQuery) {
        return subscribeToNothing();
      }
      return locationQuery.subscribe(() => {
        const state = parseTimelineUrlParams(locationQuery.read(), prefix);
        const key = serializeState(state);
        if (key !== knownRef.current) {
          knownRef.current = key;
          onParamsRef.current?.(state);
        }
        notify();
      });
    },
    [locationQuery, prefix],
  );

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const write = useCallback<UseTimelineUrlParamsResult["write"]>(
    (next, history) => {
      if (!locationQuery) {
        return;
      }
      const current = locationQuery.read();
      const merged = mergeTimelineUrlParams(current, next, prefix);
      if (merged.toString() === current.toString()) {
        return;
      }
      knownRef.current = serializeState(parseTimelineUrlParams(merged, prefix));
      locationQuery.write(merged, { history });
    },
    [locationQuery, prefix],
  );

  return { state, write };
}
