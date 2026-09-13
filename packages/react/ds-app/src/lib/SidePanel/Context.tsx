import { createContext } from "react";
import type { SidePanelContextValue } from "./types.js";

const SidePanelContext = createContext<SidePanelContextValue | null>(null);

export default SidePanelContext;
