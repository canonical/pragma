import { createContext } from "react";
import type { ContextOptions } from "./types.js";

const AppContext = createContext<ContextOptions | undefined>(undefined);

export default AppContext;
