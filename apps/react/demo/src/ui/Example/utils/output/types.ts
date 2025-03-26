import type { ExampleOutputFormat, ExampleSettingValue } from "../../types.js";

/**
 * A pair of setting name and its value.
 */
export type OutputValuePair = {
  /** Name of the setting */
  name: string;
  /** Value of the setting */
  value: ExampleSettingValue;
};

/** Output values for a setting */
export type OutputValues = {
  [key: string]: ExampleSettingValue;
};

/** All output formats, mapped to their output values */
export type AllOutput = {
  [key in ExampleOutputFormat]?: OutputValues;
};

/** Output format transformer function */
export type OutputFormatTransformer = (
  settingName: string,
  settingValue: ExampleSettingValue,
) => OutputValuePair;
