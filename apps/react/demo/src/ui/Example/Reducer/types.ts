import type {
  AllExampleSettings,
  ExampleSetting,
  ExampleSettingValue,
} from "../types.js";

/** An action to update or reset an example setting */
export interface BASE_EXAMPLE_ACTION<TExampleName extends string> {
  exampleName: TExampleName;
  type: "UPDATE_SETTING" | "RESET_EXAMPLE";
}

/** An action to update a setting for an example */
export interface UPDATE_EXAMPLE_ACTION<
  /** Name of the example */
  TExampleName extends string,
  /** The name of the setting */
  TSettingName extends keyof AllExampleSettings,
  /** The new value for the setting */
  TValue extends
    ExampleSettingValue = AllExampleSettings[TSettingName] extends ExampleSetting<
    infer V
  >
    ? V
    : ExampleSettingValue,
> extends BASE_EXAMPLE_ACTION<TExampleName> {
  type: "UPDATE_SETTING";
  /** The name of the setting, as a string literal. Allows settings to be indexed by setting name with strict type checking */
  settingName: TSettingName;
  /** The type of the new value for the setting */
  newValue: TValue;
}

/** An action to reset an example to its default settings */
export interface RESET_EXAMPLE_ACTION<
  /** Name of the example */
  TExampleName extends string,
> extends BASE_EXAMPLE_ACTION<TExampleName> {
  type: "RESET_EXAMPLE";
}

/** An action to update or reset an example settings. Unifies UPDATE_ and RESET_ types with strict type checking. */
export type ExampleAction<TExampleName extends string = string> =
  | {
      // Generate a type for each setting in AllExampleSettings
      [K in keyof AllExampleSettings]: UPDATE_EXAMPLE_ACTION<TExampleName, K>;
    }[keyof AllExampleSettings]
  | RESET_EXAMPLE_ACTION<TExampleName>;
