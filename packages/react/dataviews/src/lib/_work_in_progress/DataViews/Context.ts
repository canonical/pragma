import type {
  DataViewsProvider,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import { createContext } from "react";

/**
 * React context carrying the active DataViews provider for a root.
 *
 * `DataViews` writes to this context and `useDataViews()` reads from it.
 */
const DataViewsContext = createContext<DataViewsProvider<
  readonly SchemaFieldDefinition[]
> | null>(null);

export default DataViewsContext;
