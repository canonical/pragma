import { createContext } from "react";
import type { AnyReactRouter } from "./types.js";

/**
 * React context that carries the active router instance.
 *
 * `RouterProvider` writes to this context and `useRouter()` reads from it.
 */
const RouterContext = createContext<AnyReactRouter | null>(null);

export default RouterContext;
