import { createContext } from "react";
import type { ContextOptions } from "./types.js";

/**
 * React context carrying the active DataViews root: its provider and its
 * filter records. `DataViews` writes to this context and the hooks and
 * connected parts read from it.
 */
const Context = createContext<ContextOptions | null>(null);

export default Context;
