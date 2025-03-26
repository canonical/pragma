import type {
  AllExampleSettings,
  ConfigState,
  ShowcaseExample,
} from "../types.js";
import { generateCssVariables } from "../utils/index.js";
import type { ExampleAction } from "./types.js";

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

export default configReducer;
