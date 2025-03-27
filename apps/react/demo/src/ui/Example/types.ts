import type { FieldProps } from "@canonical/react-ds-core-form";
import type { FC, ReactElement } from "react";
import type { ProviderProps } from "./Provider/types.js";
import type { ControlsProps, RendererProps } from "./common/index.js";

export type ExampleSettingValue = number | string;
export type ExampleOutputFormat = "css";

export interface ExampleSetting<TValue extends ExampleSettingValue = string>
  extends FieldProps {
  value: TValue;
  default: TValue;
  label: string;
  disabledOutputFormats?: {
    [key in ExampleOutputFormat]?: boolean;
  };
  transformer?: (value: ExampleSettingValue) => ExampleSettingValue;
}

export type NumericExampleSetting = ExampleSetting<number>;

export interface ChoicesExampleSetting<TValue extends ExampleSettingValue>
  extends ExampleSetting<TValue> {
  inputType: "simple-choices";
}

/**
 * All supported example settings
 */
export type AllExampleSettings = {
  "--font-family"?: ChoicesExampleSetting<string>;
  "--font-size"?: NumericExampleSetting;
  "--color"?: ChoicesExampleSetting<string>;
  "--background-color"?: ChoicesExampleSetting<string>;
  "--line-height"?: NumericExampleSetting;
  "--text-align"?: ChoicesExampleSetting<string>;
  "--padding"?: NumericExampleSetting;
  "--margin"?: NumericExampleSetting;
  "--border"?: NumericExampleSetting;
  "--border-radius"?: NumericExampleSetting;
  "--box-shadow"?: ChoicesExampleSetting<string>;
  "--text-shadow"?: ChoicesExampleSetting<string>;
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

/** Structure for components associated with examples (if needed elsewhere) */
export type ExampleComponent = ((props: ProviderProps) => ReactElement) & {
  Controls: (props: ControlsProps) => ReactElement | null;
  Renderer: (props: RendererProps) => ReactElement | null;
};
