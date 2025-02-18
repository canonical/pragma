import { createContext } from "react";
import type { ContextOptions } from "./types.js";

const Context = createContext<ContextOptions | null>(null);

export default Context;
