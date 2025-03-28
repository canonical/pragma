import Context from "../Context.js";
import { useProviderState } from "../hooks/index.js";
import type { ProviderProps } from "./types.js";

const Provider = ({
  items,
  defaultValues,
  children,
  outputFormats,
}: ProviderProps) => {
  const state = useProviderState({ items, defaultValues, outputFormats });

  return <Context.Provider value={state}>{children}</Context.Provider>;
};

export default Provider;
