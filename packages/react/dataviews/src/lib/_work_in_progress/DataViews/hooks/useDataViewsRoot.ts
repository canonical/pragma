import { useContext } from "react";
import Context from "../Context.js";
import type { UseDataViewsRootResult } from "./types.js";

/**
 * The enclosing root's value — its provider and its filter records — for a
 * connected part. A part rendered outside a root has nothing to bind to,
 * and says which part it is.
 */
export default function useDataViewsRoot(part: string): UseDataViewsRootResult {
  const root = useContext(Context);
  if (root === null) {
    throw new Error(`DataViews.${part} must be used inside a DataViews root`);
  }
  return root;
}
