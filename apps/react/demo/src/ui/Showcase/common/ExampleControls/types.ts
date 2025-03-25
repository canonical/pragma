import type {
  CSSProperties,
  Dispatch,
  FC,
  ReactNode,
  SetStateAction,
} from "react";

/**
 * Props for a React component that renders the controls inside a tooltip and allows changing the example configurations.
 */
export interface ExampleControlsProps {
  id?: string;
  className?: string;
  style?: CSSProperties;
}

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

/** A valid type for an example setting's value */
export type ExampleSettingValue = number | string;

/**
 * Configuration for an example setting.
 */
export interface ExampleSetting<TValue extends ExampleSettingValue = string> {
  /** The current value of the setting */
  value: TValue;
  /** The default value of the setting */
  default: TValue;

  /** Formats to disable for exporting */
  disableFormats?: {
    /** Whether to disable exporting to CSS */
    css: boolean;
  };

  cssUnit?: string;
}

/**
 * Configuration for an example that allows selecting a number.
 */
export interface NumericExampleSetting extends ExampleSetting<number> {
  /** The minimum value for the setting */
  min: number;
  /** The maximum value for the setting */
  max: number;
  /** The step value (how much to increment/decrement by) for the setting */
  step?: number;
}

/**
 * Configuration for an example that allows selecting one choice.
 */
export interface ChoicesExampleSetting<TValue extends ExampleSettingValue>
  extends ExampleSetting<TValue> {
  /** The choices available for the setting */
  choices: TValue[];
}

/**
 * Configuration for an example that allows selecting multiple choices.
 */
export type MultipleChoicesExampleConfiguration<
  TValue extends ExampleSettingValue,
  // We use Choices setting as a base to inherit its choices property, but reset default and value to TValue[] instead of TValue to allow multiple selection
> = Omit<ChoicesExampleSetting<TValue>, "value"> & {
  /** The current value of the setting */
  value: TValue[];
  /** The default value of the setting */
  default: TValue[];
};

/**
 * Settings for an example. Each key is the name of a setting, and the value is the configuration for that setting.
 */
export type AllExampleSettings = {
  fontFamily?: ChoicesExampleSetting<string>;
  fontSize?: NumericExampleSetting;
  color?: ChoicesExampleSetting<string>;
  backgroundColor?: ChoicesExampleSetting<string>;
  lineHeight?: NumericExampleSetting;
  textAlign?: ChoicesExampleSetting<string>;
  padding?: NumericExampleSetting;
  margin?: NumericExampleSetting;
  border?: NumericExampleSetting;
  borderRadius?: NumericExampleSetting;
  boxShadow?: ChoicesExampleSetting<string>;
  textShadow?: ChoicesExampleSetting<string>;
};

/** A showcase example that can be rendered in the example renderer */
export interface ShowcaseExample {
  /** The name of the example */
  name: string;
  /** A description of the example */
  description: string;
  /** Current settings for the example */
  settings: AllExampleSettings;
  /** The component to render for the example */
  component: FC;
  /** CSS variables to apply to the component. These are derived from `settings`. */
  cssVars?: Record<string, string | number | undefined>;
}

/** The state of all examples. A key is a name of an example, the value is the example itself */
export type ConfigState = Record<string, ShowcaseExample>;

/** The context provider props for the config provider */
export interface ConfigProviderProps {
  /** The examples that can be controlled by this provider */
  examples: ShowcaseExample[];
  /** The children to render, which will have access to the config context */
  children: ReactNode;
}

/** The value of the config context */
export interface ConfigProviderValue {
  /** The current state of all examples */
  config: ConfigState;
  /** The dispatch function to update the state */
  dispatch: Dispatch<ExampleAction>;
  /** The current active example name */
  activeExampleName?: string;
  /** The function to set the active example name. Use this to change which example is currently active. */
  setActiveExampleName: Dispatch<SetStateAction<string | undefined>>;
  /** The current active example */
  activeExample?: ShowcaseExample;
  /** All examples that can be controlled by this provider */
  allExamples: ShowcaseExample[];
}
