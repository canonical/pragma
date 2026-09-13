import type {
  RowRecord,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import {
  createFilterInputs,
  isDataViewsProvider,
  readProviderHost,
} from "@canonical/dataviews-core/bindings";
import { useEffect, useMemo } from "react";
import type { UseProviderStateProps, UseProviderStateResult } from "./types.js";

/**
 * The state of one DataViews root: it observes the provider for as long
 * as the root is mounted, and owns the root's filter records.
 *
 * Observing is ref-counted on the provider, so the standalone parts inside
 * the root observing it too costs nothing, and a rehearsal mount and
 * unmount leaves a provider that starts again on the kept mount. Nothing
 * subscribes during render: the records are built in a memo and observed,
 * like the provider, from an effect, so a render React throws away leaves
 * nothing listening and a server render starts nothing.
 */
export default function useProviderState<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
>({ provider }: UseProviderStateProps<TFields, TRow>): UseProviderStateResult {
  if (!isDataViewsProvider(provider)) {
    throw new Error(
      "DataViews requires a provider created by createDataViewsProvider",
    );
  }
  // The context stores the widest provider shape, schema and record type
  // alike; the hooks narrow it back after checking the collection.
  const widest = provider as UseProviderStateResult["provider"];
  const inputs = useMemo(
    () => createFilterInputs({ host: readProviderHost(widest) }),
    [widest],
  );
  useEffect(() => provider.observe(), [provider]);
  useEffect(() => inputs.observe(), [inputs]);
  return useMemo(
    () => ({ provider: widest, filters: inputs.handles }),
    [widest, inputs],
  );
}
