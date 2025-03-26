import { type FC, useMemo, useReducer, useState } from "react";
import Context from "../Context.js";
import { Reducer } from "../Reducer/index.js";
import type { ConfigState } from "../types.js";
import type { ProviderProps, ProviderValue } from "./types.js";

/**
 * Provider for the Example component.
 * @param items The examples that can be controlled by this provider
 * @param children The children to render, which will have access to the config context
 */
const Provider: FC<ProviderProps> = ({ items, children }) => {
  const initialState: ConfigState = items.reduce(
    (acc: ConfigState, example) => {
      acc[example.name] = example;
      return acc;
    },
    {},
  );

  const [config, dispatch] = useReducer(Reducer, initialState);

  // Default to the first item
  const [activeExampleName, setActiveExampleName] = useState<
    string | undefined
  >(items?.length ? items[0].name : undefined);

  const activeExampleConfig = useMemo(
    () => (activeExampleName ? config[activeExampleName] : undefined),
    [config, activeExampleName],
  );

  const value: ProviderValue = useMemo(
    () => ({
      config,
      dispatch,
      activeExampleName,
      setActiveExampleName,
      activeExample: activeExampleConfig,
      allExamples: items,
    }),
    [config, activeExampleName, activeExampleConfig, items],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export default Provider;
