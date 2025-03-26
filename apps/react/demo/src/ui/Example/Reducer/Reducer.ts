import type { ExampleControl } from "../types.js";
import { generateOutput } from "../utils/output/index.js";
import type {
  ConfigState,
  ExampleAction,
  ShowcaseExampleState,
} from "./types.js";

/**
 * Reducer that handles updating context state immutably based on the controls array.
 * @param state The current state (`ConfigState`).
 * @param action The action to perform (`ExampleAction`).
 * @returns The new state (`ConfigState`).
 */
const configReducer = (
  state: ConfigState,
  action: ExampleAction | undefined,
): ConfigState => {
  if (!action) return state ?? {};

  switch (action.type) {
    // --- Update a setting ---
    case "UPDATE_SETTING": {
      const { exampleName, settingName, newValue } = action;
      const example = state[exampleName];

      // If the example doesn't exist, return the current state unchanged
      if (!example) {
        return state;
      }

      let hasControlChanged = false;
      const updatedControlsArray: ExampleControl[] = example.controls.map(
        (control) => {
          if (control.name === settingName) {
            if (control.value !== newValue) {
              hasControlChanged = true;
              return {
                ...control,
                value: newValue,
              } as ExampleControl;
            }
          }
          // No change needed, return the original object reference
          return control;
        },
      );

      // If the target control wasn't found or value didn't change, return original state
      if (!hasControlChanged) {
        return state;
      }

      // --- Generate new output based on the updated controls array ---
      const newOutput = generateOutput(updatedControlsArray);

      const updatedExample: ShowcaseExampleState = {
        ...example,
        controls: updatedControlsArray,
        output: newOutput,
      };

      return {
        ...state,
        [exampleName]: updatedExample,
      };
    }

    case "RESET_EXAMPLE": {
      const { exampleName } = action;
      const example = state[exampleName];

      // If the example doesn't exist, return the current state unchanged
      if (!example) {
        return state;
      }

      let hasAnyReset = false;
      const resetControlsArray: ExampleControl[] = example.controls.map(
        (control) => {
          if (control.value !== control.default) {
            hasAnyReset = true;
            // Return a *new* object with value reset to default
            return {
              ...control,
              value: control.default,
            } as ExampleControl;
          }
          // If value is already default, return the original object reference
          return control;
        },
      );

      // Optimization: If no control values needed resetting, return original state
      if (!hasAnyReset) {
        return state;
      }

      const newOutput = generateOutput(resetControlsArray);

      const resetExample: ShowcaseExampleState = {
        ...example,
        controls: resetControlsArray,
        output: newOutput,
      };

      return {
        ...state,
        [exampleName]: resetExample,
      };
    }

    default:
      return state;
  }
};

export default configReducer;
