import { type FC, useMemo, useReducer, useState } from "react";
import Context from "./Context.js";
import type {
  AllExampleSettings,
  ConfigState,
  ExampleAction,
  ProviderProps,
  ProviderValue,
  ShowcaseExample,
} from "./types.js";
import { generateCssVariables } from "./utils/index.js";

const Provider: FC<ProviderProps> = ({ examples, children }) => {
  const initialState: ConfigState = examples.reduce(
    (acc: ConfigState, example) => {
      acc[example.name] = example;
      return acc;
    },
    {},
  );

  const [config, dispatch] = useReducer(configReducer, initialState);
  const [activeExampleName, setActiveExampleName] = useState<
    string | undefined
  >(examples?.length ? examples[0].name : undefined);

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
      allExamples: examples,
    }),
    [config, activeExampleName, activeExampleConfig, examples],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
};

/**
 * Reducer that handles updating context state
 * @param state The current state
 * @param action The action to perform
 * @returns The new state
 */
const configReducer = (
  state: ConfigState,
  action: ExampleAction,
): ConfigState => {
  if (!action) return {};
  switch (action.type) {
    // Update a setting for an example
    case "UPDATE_SETTING": {
      const { exampleName, settingName, newValue } = action;
      const updatedState = {
        ...state,
        [exampleName]: {
          ...state[exampleName],
          settings: {
            ...state[exampleName]?.settings,
            [settingName]: {
              ...state[exampleName]?.settings?.[settingName],
              value: newValue,
            },
          },
        },
      };
      return {
        ...updatedState,
        [exampleName]: {
          ...updatedState[exampleName],
          cssVars: generateCssVariables(updatedState[exampleName].settings),
        },
      };
    }
    // Reset example to defaults
    case "RESET_EXAMPLE": {
      const { exampleName } = action;
      const { [exampleName]: exampleToReset, ...restOfState } = state;
      if (exampleToReset) {
        for (const key in exampleToReset.settings) {
          const setting =
            exampleToReset.settings[key as keyof AllExampleSettings];
          if (setting) {
            setting.value = setting.default;
          }
        }
        const resetExample: ShowcaseExample = {
          ...exampleToReset,
          settings: exampleToReset.settings,
          cssVars: generateCssVariables(exampleToReset.settings),
        };
        return {
          ...restOfState,
          [exampleName]: resetExample,
        };
      }
      return state;
    }
    default:
      return state;
  }
};

export default Provider;
