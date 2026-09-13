import type { FilterHandle } from "@canonical/dataviews-core";
import { useMemo, useSyncExternalStore } from "react";
import type { UseFilterHandleResult } from "./types.js";

/**
 * Bind to one filter handle: its text input, applied semantic value and
 * feedback, with edit, set and clear routed through the record. The
 * subscription is the handle's two channels and nothing else, so a control
 * re-renders for its own filter only.
 */
export default function useFilterHandle<TApplied>(
  handle: FilterHandle<TApplied>,
): UseFilterHandleResult<TApplied> {
  const state = useSyncExternalStore(
    handle.state.subscribe,
    handle.state.get,
    handle.state.get,
  );
  const applied = useSyncExternalStore(
    handle.applied.subscribe,
    handle.applied.get,
    handle.applied.get,
  );
  return useMemo(
    () => ({
      input: state.input,
      applied,
      feedback: state.feedback,
      edit: handle.edit,
      set: handle.set,
      clear: handle.clear,
    }),
    [handle, state.input, state.feedback, applied],
  );
}
