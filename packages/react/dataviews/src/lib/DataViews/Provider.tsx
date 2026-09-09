import type {
  DataViewsProvider,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import { isIdentity } from "@canonical/dataviews-core";
import type { ReactElement } from "react";
import DataViewsContext from "./Context.js";
import type { DataViewsProps } from "./types.js";

/**
 * The DataViews root: mounts the collection provider's context for the
 * hooks and connected parts of the composition.
 *
 * Pure composition — no single root element (AGENTS.md rule 6): the root is
 * a context mount, not a DOM node.
 */
export default function DataViews<
  TFields extends readonly SchemaFieldDefinition[],
>({ provider, children }: DataViewsProps<TFields>): ReactElement {
  if (!isIdentity(provider?.identity)) {
    throw new Error(
      "DataViews requires a provider created by createDataViewsProvider",
    );
  }
  // The context stores the widest provider shape; the hooks' identity
  // witness narrows it back to the caller's schema at runtime.
  const value = provider as unknown as DataViewsProvider<
    readonly SchemaFieldDefinition[]
  >;
  return (
    <DataViewsContext.Provider value={value}>
      {children}
    </DataViewsContext.Provider>
  );
}
