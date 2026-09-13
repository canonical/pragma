import type {
  Collection,
  FilterHandle,
  FilterHandles,
  PredicateOperator,
  RowRecord,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import { useContext } from "react";
import Context from "../Context.js";
import { findFilterHandle } from "../common/utils/index.js";
import type { UseDataViewsFilterResult } from "./types.js";
import useFilterHandle from "./useFilterHandle.js";

/** The applied type of one filter address, from the collection's fields. */
type AppliedAt<
  TFields extends readonly SchemaFieldDefinition[],
  TField extends keyof FilterHandles<TFields>,
  TOperator extends keyof FilterHandles<TFields>[TField],
> =
  FilterHandles<TFields>[TField][TOperator] extends FilterHandle<infer TApplied>
    ? TApplied
    : never;

/**
 * Bind to one filter of the enclosing root: its text input, applied
 * semantic value and feedback, with edit, set and clear routed through the
 * root's record for that field and operator.
 *
 * The collection is the type and identity witness, as for `useDataViews`;
 * the field and operator are checked against its schema at compile time,
 * and the applied value is typed by the field's kind.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function useDataViewsFilter<
  TFields extends readonly SchemaFieldDefinition[],
  TField extends keyof FilterHandles<TFields> & string,
  TOperator extends keyof FilterHandles<TFields>[TField] & PredicateOperator,
  TRow extends object = RowRecord,
>(
  collection: Collection<TFields, TRow>,
  field: TField,
  operator: TOperator,
): UseDataViewsFilterResult<AppliedAt<TFields, TField, TOperator>> {
  const root = useContext(Context);
  if (root === null) {
    throw new Error("useDataViewsFilter must be used inside a DataViews root");
  }
  if (root.provider.collection !== collection) {
    throw new Error(
      "useDataViewsFilter was passed a collection that is not the one the enclosing DataViews root's provider was built over",
    );
  }
  // Checked above: the root's handles are this collection's, so the one at
  // this address applies what the field's kind says it does.
  return useFilterHandle(
    findFilterHandle<AppliedAt<TFields, TField, TOperator>>(
      root.filters,
      field,
      operator,
    ),
  );
}
