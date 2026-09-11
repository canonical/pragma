import type {
  DataViewsProvider,
  RowRecord,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import { isIdentity } from "@canonical/dataviews-core";
import type { ReactElement } from "react";
import DataViewsContext from "./Context.js";
import { Filters, Pagination } from "./common/index.js";
import type { DataViewsProps } from "./types.js";

/**
 * The DataViews root: mounts the collection provider's context for the
 * hooks and connected parts of the composition.
 *
 * Pure composition — no single root element (AGENTS.md rule 6): the root is
 * a context mount, not a DOM node.
 */
function DataViews<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
>({ provider, children }: DataViewsProps<TFields, TRow>): ReactElement {
  if (!isIdentity(provider?.identity)) {
    throw new Error(
      "DataViews requires a provider created by createDataViewsProvider",
    );
  }
  // The context stores the widest provider shape, schema and record type
  // alike; the hooks' identity witness narrows it back at runtime.
  const value = provider as DataViewsProvider<readonly SchemaFieldDefinition[]>;
  return (
    <DataViewsContext.Provider value={value}>
      {children}
    </DataViewsContext.Provider>
  );
}

/** The connected query-editing part of the composition. */
DataViews.Filters = Filters;
/** The connected window-navigation part of the composition. */
DataViews.Pagination = Pagination;

export default DataViews;
