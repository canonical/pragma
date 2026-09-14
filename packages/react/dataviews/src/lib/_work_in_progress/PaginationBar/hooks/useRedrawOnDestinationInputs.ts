import type {
  RowRecord,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import { readProviderHost } from "@canonical/dataviews-core/bindings";
import { useCallback, useSyncExternalStore } from "react";
import { subscribeToDestinationInputs } from "../../../utils/index.js";
import type {
  UseRedrawOnDestinationInputsProps,
  UseRedrawOnDestinationInputsResult,
} from "./types.js";

/**
 * Redraw when the saved view open beside the query, or the location's other
 * parameters, move — either can move without the query, and the
 * destinations a render spells read both. Their text is what React
 * compares, so a notification that leaves both as they were redraws
 * nothing; without a location, only the open view is watched.
 */
export default function useRedrawOnDestinationInputs<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
>({
  provider,
}: UseRedrawOnDestinationInputsProps<
  TFields,
  TRow
>): UseRedrawOnDestinationInputsResult {
  const { location, view } = readProviderHost(provider);
  const subscribe = useCallback(
    (listener: () => void) =>
      subscribeToDestinationInputs({ view, location }, listener),
    [view, location],
  );
  const read = useCallback(
    () => `${view.get() ?? ""}\u0000${location?.read().toString() ?? ""}`,
    [view, location],
  );
  useSyncExternalStore(subscribe, read, read);
  return undefined;
}
