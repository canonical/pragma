import type { FieldProps } from "@canonical/react-ds-core-form";
import type { Dispatch, ReactElement, SetStateAction } from "react";
import type { ProviderProps } from "./Provider/types.js";
import type { ControlsProps, RendererProps } from "./common/index.js";

export type ExampleSettingValue = number | string;
export type ExampleOutputFormat = "css";

export interface ExampleSetting<TValue extends ExampleSettingValue = string>
  extends FieldProps {
  defaultValue?: TValue;
  label: string;
  disabledOutputFormats?: {
    [key in ExampleOutputFormat]?: boolean;
  };
  transformer?: (value: ExampleSettingValue) => ExampleSettingValue;
}

export type ExampleControl = {
  [TValue in ExampleSettingValue]: ExampleSetting<TValue>;
}[ExampleSettingValue];

/** An example to be showcased. Contains an example's metadata, controls/settings, and which component it is bound to. */
export interface ShowcaseExample {
  /** Unique identifier name */
  name: string;
  /** User-friendly description */
  description: string;
  /** The React component to render */
  Component: () => ReactElement;
  /**
   * Array defining the controls and their initial/default configuration for this example.
   * The `value` property within these initial configs is often ignored, as the
   * state initialization will typically set `value` based on `default`.
   */
  controls: ExampleControl[];
}

export type ExampleComponent = ((props: ProviderProps) => ReactElement) & {
  Controls: (props: ControlsProps) => ReactElement | null;
  Renderer: (props: RendererProps) => ReactElement | null;
};

/** The value of the config context */
export interface ContextOptions {
  /** The current active example name */
  activeExampleIndex?: number;
  /** The function to set the active example name. Use this to change which example is currently active. */
  setActiveExampleIndex: Dispatch<SetStateAction<number>>;
  /** All examples that can be controlled by this provider */
  allExamples: ShowcaseExample[];
  /** The currently active example's parameters */
  activeExample: ShowcaseExample;
  // biome-ignore lint/suspicious/noExplicitAny: fixme later
  output: { [key in ExampleOutputFormat]: any };
}
