import { createContext } from "react";
import type { HeadCollector } from "./types.js";

export interface HeadContextValue {
  readonly collector: HeadCollector | null;
}

const HeadContext = createContext<HeadContextValue>({ collector: null });

export default HeadContext;
