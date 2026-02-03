import AppContext from "./AppContext.js";
import { useProviderState } from "./hooks/index.js";
import type { ProviderProps } from "./types.js";

const Provider = ({ children, outputFormats }: ProviderProps) => {
  const state = useProviderState({ outputFormats });

  return <AppContext.Provider value={state}>{children}</AppContext.Provider>;
};

export default Provider;
