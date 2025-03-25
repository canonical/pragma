import {
  type FC,
  createContext,
  useContext,
  useMemo,
  useReducer,
  useState,
} from "react";
import type {
  AllExampleSettings,
  ConfigProviderProps,
  ConfigProviderValue,
  ConfigState,
  ExampleAction,
  ShowcaseExample,
} from "./types.js";

import { casing } from "@canonical/utils";

const ConfigContext = createContext<ConfigProviderValue | undefined>(undefined);

/**
 * Generate CSS variables from the settings of an example
 * @param settings The settings of an example
 */
const generateCssVariables = (
  settings: AllExampleSettings,
): Record<string, string | number | undefined> => {
  const cssVars: Record<string, string | number | undefined> = {};
  for (const settingName in settings) {
    const setting = settings[settingName as keyof AllExampleSettings];
    if (!setting || setting.disableFormats?.css || setting.value === undefined)
      continue;
    const cssVarName = `--${casing.toKebabCase(settingName)}`;
    cssVars[cssVarName] = `${setting.value}${setting.cssUnit || ""}`;
  }
  return cssVars;
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

export const ConfigProvider: FC<ConfigProviderProps> = ({
  examples,
  children,
}) => {
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

  const value: ConfigProviderValue = useMemo(
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

  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
};

export const useConfig = (): ConfigProviderValue => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }
  return context;
};
