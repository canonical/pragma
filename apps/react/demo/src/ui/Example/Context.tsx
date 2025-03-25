import { createContext } from "react";
import type { ProviderValue } from "./types.js";

const Context = createContext<ProviderValue | undefined>(undefined);

export default Context;
