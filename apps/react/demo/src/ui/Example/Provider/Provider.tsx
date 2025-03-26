import React, { type FC, useMemo, useReducer, useState } from "react";
import Context from "../Context.js";
import { type ConfigState, Reducer } from "../Reducer/index.js";
import type { ExampleControl, ShowcaseExampleOpts } from "../types.js";
import generateAllOutput from "../utils/output/generateOutput.js";
import type { ProviderProps, ProviderValue } from "./types.js";

const Provider: FC<ProviderProps> = ({ items = [], children }) => {
  const initialState = useMemo((): ConfigState => {
    return items.reduce(
      (acc: ConfigState, exampleOpts: ShowcaseExampleOpts) => {
        const initialControlsState: ExampleControl[] = exampleOpts.controls.map(
          (controlConfig: ExampleControl) =>
            ({
              ...controlConfig,
              value: controlConfig.default,
            }) as ExampleControl,
        );

        const { controls, ...baseExampleData } = exampleOpts;

        acc[exampleOpts.name] = {
          ...baseExampleData,
          controls: initialControlsState,
          output: generateAllOutput(initialControlsState),
        };
        return acc;
      },
      {},
    );
  }, [items]);

  const [state, dispatch] = useReducer(Reducer, initialState);

  // Default to the first item if available
  const [activeExampleName, setActiveExampleName] = useState<
    string | undefined
  >(items?.length ? items[0].name : undefined);

  const activeExample = useMemo(
    () => (activeExampleName ? state[activeExampleName] : undefined),
    [state, activeExampleName],
  );

  const value: ProviderValue = useMemo(
    () => ({
      config: state,
      dispatch,
      activeExampleName,
      setActiveExampleName,
      activeExample,
      allExamples: items,
    }),
    [state, activeExampleName, activeExample, items],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export default Provider;
