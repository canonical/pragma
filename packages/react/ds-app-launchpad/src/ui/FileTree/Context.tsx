import { createContext } from "react";
import { ContextOptions } from "./types.js";

const Context = createContext<ContextOptions | null>(null);

export default Context;
