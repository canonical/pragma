import { useCallback, useMemo } from "react";
import type {
  UseSelectAllOnPageProps,
  UseSelectAllOnPageResult,
} from "./types.js";
import useDataViewsValue from "./useDataViewsValue.js";

/**
 * Select every record on the page at once, and say how much of the page is
 * selected. Its scope is the identities given, which a control's name should
 * say: toggling adds or removes exactly those and leaves a selection made
 * elsewhere in the collection alone. Checked only when every one is
 * selected, and never over an empty page; mixed when some are.
 */
export default function useSelectAllOnPage({
  selection,
  ids,
}: UseSelectAllOnPageProps): UseSelectAllOnPageResult {
  const state = useDataViewsValue(selection.state);
  // Counted, not filtered: this runs on every render of its control, and an
  // intermediate array per render is one allocation and one scan the count
  // does not need.
  const selected = useMemo(() => {
    let count = 0;
    for (const id of ids) {
      if (state.ids.has(id)) {
        count += 1;
      }
    }
    return count;
  }, [ids, state]);
  const checked = ids.length > 0 && selected === ids.length;
  const mixed = selected > 0 && !checked;
  const toggle = useCallback(() => {
    if (checked) {
      selection.remove(ids);
    } else {
      selection.add(ids);
    }
  }, [checked, selection, ids]);
  return useMemo(() => ({ checked, mixed, toggle }), [checked, mixed, toggle]);
}
