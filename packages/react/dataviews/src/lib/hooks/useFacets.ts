import type {
  DataViewsState,
  RowRecord,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import { useMemo } from "react";
import type { UseFacetsProps, UseFacetsResult } from "./types.js";
import useAnsweredFacets from "./useAnsweredFacets.js";
import useDataViewsValue from "./useDataViewsValue.js";

/**
 * The facets the latest result answered, whichever query it answered. One
 * function at module scope, so the read takes one subscription.
 */
const readLatest = <TRow extends object>(
  state: DataViewsState<TRow>,
): UseFacetsResult["latest"] => state.result.facets;

/**
 * The facets of the result, and nothing else of the state, read two ways.
 * Those answering the applied query are null while no result answers it —
 * before the first page, while another query is pending over rows an earlier
 * one produced — so a control never shows counts or ranges computed for
 * another restriction. The latest are whatever the latest result answered,
 * kept until a newer result lands — while a query is pending, or after it
 * fails, as the rows on screen are — so what they list does not vanish under
 * the edit that made the query.
 *
 * A part that reads only the answered facets takes `useAnsweredFacets`, and
 * one subscription with it.
 */
export default function useFacets<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
>({ provider }: UseFacetsProps<TFields, TRow>): UseFacetsResult {
  const answered = useAnsweredFacets({ provider });
  const latest = useDataViewsValue(provider.state, readLatest);
  return useMemo(() => ({ answered, latest }), [answered, latest]);
}
