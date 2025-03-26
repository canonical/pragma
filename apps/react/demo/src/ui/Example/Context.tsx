import { createContext } from "react";
import type { ProviderValue } from "./Provider/index.js";

const Context = createContext<ProviderValue | undefined>(undefined);

export default Context;
