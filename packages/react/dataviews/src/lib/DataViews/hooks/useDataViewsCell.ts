import type {
  DataViewsProvider,
  RowRecord,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import { isIdentity } from "@canonical/dataviews-core";
import { useContext, useMemo } from "react";
import CellScopeContext from "../CellScopeContext.js";
import type { UseDataViewsCellResult } from "./types.js";

/**
 * Read the current cell's scope, installed by the table renderer.
 *
 * The passed provider is an identity witness: it must be the exact provider
 * the enclosing DataViews root mounts, and the hook must run inside a
 * component returned by a column's `render` — not in an arbitrary callback.
 */
export default function useDataViewsCell<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
>(provider: DataViewsProvider<TFields, TRow>): UseDataViewsCellResult {
  if (!isIdentity(provider?.identity)) {
    throw new Error(
      "useDataViewsCell requires a provider created by createDataViewsProvider",
    );
  }
  const scope = useContext(CellScopeContext);
  if (scope === null) {
    throw new Error(
      "useDataViewsCell must be used inside a cell rendered by a DataViews table",
    );
  }
  if (scope.provider !== provider) {
    throw new Error(
      "useDataViewsCell was passed a provider that is not the enclosing cell's provider",
    );
  }
  // Memoised on the scope the table installed, which is itself stable for a
  // mounted cell, so a custom cell may memoise on what it is handed.
  return useMemo(() => {
    const { provider: _provider, ...cellScope } = scope;
    return cellScope;
  }, [scope]);
}
