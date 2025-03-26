import type { FC, ReactElement } from "react";
import type { ProviderProps } from "./Provider/types.js";
import type { ControlsProps, RendererProps } from "./common/index.js";
import type { AllOutput } from "./utils/index.js";

export type ExampleSettingValue = number | string;
export type ExampleOutputFormat = "css";

export interface ExampleSetting<TValue extends ExampleSettingValue = string> {
  value: TValue;
  default: TValue;
  label: string;
  disabledOutputFormats?: {
    [key in ExampleOutputFormat]?: boolean;
  };
  transformer?: (value: ExampleSettingValue) => ExampleSettingValue;
  type: "number" | "string" | "choices";
}

export interface NumericExampleSetting extends ExampleSetting<number> {
  min: number;
  max: number;
  step?: number;
  type: "number";
}

export interface ChoicesExampleSetting<TValue extends ExampleSettingValue>
  extends ExampleSetting<TValue> {
  choices: TValue[];
  type: "choices";
}

export type MultipleChoicesExampleConfiguration<
  TValue extends ExampleSettingValue,
> = Omit<ChoicesExampleSetting<TValue>, "value" | "default"> & {
  value: TValue[];
  default: TValue[];
};

// --- Definition of All Possible Setting Types (Unchanged) ---

/**
 * All supported example settings
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

/**
 * Represents the configuration and state for a single control/setting object
 * within the `controls` array. It's a discriminated union based on the 'name' property.
 * This structure is used both for initial configuration and within the state array.
 */
export type ExampleControl = {
  [K in keyof AllExampleSettings]-?: {
    name: K;
  } & Required<AllExampleSettings>[K];
}[keyof AllExampleSettings];

/**
 * Defines the initial configuration required to set up a showcase example.
 * This is typically used when initializing the context state via the Provider's `items` prop.
 */
export interface ShowcaseExampleOpts {
  /** Unique identifier name */
  name: string;
  /** User-friendly description */
  description: string;
  /** The React component to render */
  Component: FC;
  /**
   * Array defining the controls and their initial/default configuration for this example.
   * The `value` property within these initial configs is often ignored, as the
   * state initialization will typically set `value` based on `default`.
   */
  controls: ExampleControl[];
}

// --- Other Supporting Types (Unchanged) ---

/** Structure for components associated with examples (if needed elsewhere) */
export type ExampleComponent = ((props: ProviderProps) => ReactElement) & {
  Controls: (props: ControlsProps) => ReactElement | null;
  Renderer: (props: RendererProps) => ReactElement | null;
};

// --- Action Types for Reducer (Unchanged) ---

/** Action to update a specific setting's value for a given example */
type UpdateSettingAction = {
  type: "UPDATE_SETTING";
  exampleName: string;
  // Identifies the control within the `controls` array by its `name` property
  settingName: keyof AllExampleSettings;
  newValue: ExampleSettingValue | ExampleSettingValue[];
};

/** Action to reset all controls of an example to their default values */
type ResetExampleAction = {
  type: "RESET_EXAMPLE";
  exampleName: string;
};

/** Union of all possible actions the reducer can handle */
export type ExampleAction = UpdateSettingAction | ResetExampleAction;
