import { createContext } from "react";
import type { ContextOptions } from "./types.js";

export const rootLevelEmptyContext: ContextOptions = {
  depth: 0,
  path: "",
  addChildNode: () => {},
  childNodes: [],
};

const Context = createContext<ContextOptions>(rootLevelEmptyContext);

export default Context;
