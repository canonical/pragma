import Context from "./Context.js";
import { useProviderState } from "./hooks/index.js";
import type { ProviderProps } from "./types.js";

const Provider = ({
  children,
  outputFormats,
  ...otherProviderProps
}: ProviderProps) => {
  const state = useProviderState({ outputFormats, ...otherProviderProps });

  return <Context.Provider value={state}>{children}</Context.Provider>;
};

export default Provider;
