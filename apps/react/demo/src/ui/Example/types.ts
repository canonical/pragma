import type { FC, ReactElement } from "react";
import type { ProviderProps } from "./Provider/types.js";
import type { ControlsProps, RendererProps } from "./common/index.js";

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
  Component: FC;
  /** CSS variables to apply to the component. These are derived from `settings`. */
  cssVars?: Record<string, string | number | undefined>;
}

/** The state of all examples. A key is a name of an example, the value is the example itself */
export type ConfigState = Record<string, ShowcaseExample>;

export type ExampleComponent = ((props: ProviderProps) => ReactElement) & {
  Controls: (props: ControlsProps) => ReactElement | null;
  Renderer: (props: RendererProps) => ReactElement | null;
};
