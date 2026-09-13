import type { FieldHandle } from "@canonical/dataviews-core";
import { useMemo, useSyncExternalStore } from "react";
import type { UseDataViewsFieldResult } from "./types.js";

/**
 * Bind to one field handle: its text input, applied semantic value and
 * feedback, with edit and clear routed through the provider.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function useDataViewsField<TApplied>(
  handle: FieldHandle<TApplied>,
): UseDataViewsFieldResult<TApplied> {
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
