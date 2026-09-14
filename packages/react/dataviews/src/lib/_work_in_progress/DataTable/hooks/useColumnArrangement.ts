import { resolveColumnArrangement } from "@canonical/dataviews-core/bindings";
import { useMemo } from "react";
import { useDataViewsValue } from "../../../hooks/index.js";
import { areColumnsEqual } from "../common/utils/index.js";
import type {
  UseColumnArrangementProps,
  UseColumnArrangementResult,
} from "./types.js";
import useStableValue from "./useStableValue.js";

/**
 * The columns one table renders, as the provider's presentation arranges
 * them: in the stored order, less the hidden ones. The declared list is the
 * lowest layer — its order stands where nothing is stored, and every
 * column is shown — and a column declared `hideable: false` is never
 * hidden. Held at one reference while the visible columns are the same,
 * so a width change alone re-renders no header and re-mints no layout.
 */
export default function useColumnArrangement({
  presentation,
  columns,
}: UseColumnArrangementProps): UseColumnArrangementResult {
  // The arrangement alone: a change to the reason re-renders no table.
  const arrangement = useDataViewsValue(
    presentation.state,
    (shown) => shown.presentation,
  );
  const visible = useMemo(
    () =>
      resolveColumnArrangement(columns, arrangement)
        .filter(({ hidden }) => !hidden)
        .map(({ column }) => column),
    [columns, arrangement],
  );
  return useStableValue(visible, areColumnsEqual);
}
