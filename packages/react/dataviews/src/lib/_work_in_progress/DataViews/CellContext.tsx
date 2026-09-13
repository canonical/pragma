import { createContext } from "react";
import type { CellContextValue } from "./types.js";

/**
 * React context carrying the current cell, installed by the table renderer
 * per cell. `useDataViewsCell(collection)` reads from it.
 */
const CellContext = createContext<CellContextValue | null>(null);

export default CellContext;
