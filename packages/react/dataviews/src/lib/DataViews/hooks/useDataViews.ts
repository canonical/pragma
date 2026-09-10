import type {
  DataViewsProvider,
  RowRecord,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import { isIdentity } from "@canonical/dataviews-core";
import { useContext, useMemo } from "react";
import DataViewsContext from "../Context.js";
import type { UseDataViewsResult } from "./types.js";

/**
 * Read the enclosing DataViews root's typed collection scope.
 *
 * The passed provider is an identity witness: it must be the exact provider
 * the enclosing root mounts. The returned scope is stable across renders for
 * the provider's lifetime.
 */
export default function useDataViews<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
>(
  provider: DataViewsProvider<TFields, TRow>,
): UseDataViewsResult<TFields, TRow> {
  if (!isIdentity(provider?.identity)) {
    throw new Error(
      "useDataViews requires a provider created by createDataViewsProvider",
    );
  }
  const nearest = useContext(DataViewsContext);
  if (nearest === null) {
    throw new Error("useDataViews must be used inside a DataViews root");
  }
  if (nearest !== provider) {
    throw new Error(
      "useDataViews was passed a provider that is not the enclosing DataViews root's provider",
    );
  }
  return useMemo(
    () => ({
      result: provider.result,
      rows: provider.rows,
      selection: provider.selection,
      fields: provider.fields,
      navigateWindow: provider.navigateWindow,
      setSort: provider.setSort,
      setSearch: provider.setSearch,
      refresh: provider.refresh,
      adopt: provider.adopt,
      invokeAction: provider.invokeAction,
    }),
    [provider],
  );
}
