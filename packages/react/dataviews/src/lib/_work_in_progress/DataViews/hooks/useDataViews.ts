import type {
  Collection,
  DataViewsProvider,
  FilterHandles,
  RowRecord,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import { useContext, useMemo } from "react";
import Context from "../Context.js";
import type { UseDataViewsResult } from "./types.js";

/**
 * Read the enclosing DataViews root's typed collection scope.
 *
 * The collection is the type and identity witness: it must be the exact
 * module-scope collection the enclosing root's provider was built over, and
 * a nested root over another collection rejects it rather than answering
 * with the wrong records typed as the right ones. The returned scope is
 * stable across renders for the root's lifetime.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function useDataViews<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
>(collection: Collection<TFields, TRow>): UseDataViewsResult<TFields, TRow> {
  const root = useContext(Context);
  if (root === null) {
    throw new Error("useDataViews must be used inside a DataViews root");
  }
  if (root.provider.collection !== collection) {
    throw new Error(
      "useDataViews was passed a collection that is not the one the enclosing DataViews root's provider was built over",
    );
  }
  // Checked above: the root's provider was built over this very collection,
  // so its records are the collection's and the widest shape the context
  // holds narrows back to the types the caller named.
  const provider = root.provider as DataViewsProvider<TFields, TRow>;
  const filters = root.filters as FilterHandles<TFields>;
  return useMemo(
    () => ({
      collection: provider.collection,
      capabilities: provider.capabilities,
      state: provider.state,
      rows: provider.rows,
      issues: provider.issues,
      selection: provider.selection,
      views: provider.views,
      filters,
      navigateWindow: provider.navigateWindow,
      setSort: provider.setSort,
      setSearch: provider.setSearch,
      setGroup: provider.setGroup,
      setCollapsed: provider.setCollapsed,
      refresh: provider.refresh,
      refusals: provider.refusals,
      runAction: provider.runAction,
    }),
    [provider, filters],
  );
}
