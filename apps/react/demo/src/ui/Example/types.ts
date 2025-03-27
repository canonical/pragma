import type { FieldProps } from "@canonical/react-ds-core-form";
import type { ReactElement } from "react";
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
