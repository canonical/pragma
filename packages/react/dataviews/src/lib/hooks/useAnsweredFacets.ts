import type {
  DataViewsState,
  RowRecord,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import type {
  UseAnsweredFacetsProps,
  UseAnsweredFacetsResult,
} from "./types.js";
import useDataViewsValue from "./useDataViewsValue.js";

/**
 * The facets of the result answering the applied query, or null while none
 * answers it. One function at module scope, so every part reading it holds
 * the same selector and takes one subscription.
 */
const readAnswered = <TRow extends object>(
  state: DataViewsState<TRow>,
): UseAnsweredFacetsResult =>
  state.result.provenance?.slice === state.slice ? state.result.facets : null;

/**
 * The facets answering the applied query, and nothing else of the state:
 * null before the first page, while another query is pending over rows an
 * earlier one produced, and after a failure — so a chart or a control never
 * shows counts or ranges computed for another restriction.
 */
export default function useAnsweredFacets<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
>({
  provider,
}: UseAnsweredFacetsProps<TFields, TRow>): UseAnsweredFacetsResult {
  return useDataViewsValue(provider.state, readAnswered);
}
