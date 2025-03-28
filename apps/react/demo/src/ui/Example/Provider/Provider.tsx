import Context from "../Context.js";
import type { ProviderProps } from "./types.js";
import useProviderState from "./useProviderState.js";

const Provider = ({ items = [], defaultValues, children }: ProviderProps) => {
  const state = useProviderState({ items, defaultValues });

  return <Context.Provider value={state}>{children}</Context.Provider>;
};

export default Provider;
