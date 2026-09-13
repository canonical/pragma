import type {
  DataViewsProvider,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import { useContext } from "react";
import DataViewsContext from "../Context.js";

/**
 * The enclosing root's provider, for a connected part. A part rendered
 * outside a root has nothing to bind to, and says which part it is.
 */
export default function useDataViewsRoot(
  part: string,
): DataViewsProvider<readonly SchemaFieldDefinition[]> {
  const provider = useContext(DataViewsContext);
  if (provider === null) {
    throw new Error(`DataViews.${part} must be used inside a DataViews root`);
  }
  return provider;
}
