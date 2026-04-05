import { createContext } from "react";
import type { AnyReactRouter } from "./types.js";

const RouterContext = createContext<AnyReactRouter | null>(null);

export default RouterContext;
