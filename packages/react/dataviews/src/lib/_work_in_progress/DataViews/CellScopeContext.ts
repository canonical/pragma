import { createContext } from "react";
import type { CellScopeValue } from "./types.js";

/**
 * React context carrying the current cell scope, installed by the table
 * renderer per cell. `useDataViewsCell()` reads from it.
 */
const CellScopeContext = createContext<CellScopeValue | null>(null);

export default CellScopeContext;
