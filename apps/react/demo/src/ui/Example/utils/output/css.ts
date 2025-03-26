import { casing } from "@canonical/utils";
import type { ExampleSettingValue } from "../../types.js";
import type { OutputFormatTransformer, OutputValuePair } from "./types.js";

/**
 * Convert a setting name and value to a CSS variable.
 * @param settingName Name of the setting
 * @param settingValue Value of the setting (already transformed in the generateOutput function)
 */
const toCssVariable: OutputFormatTransformer = (
  settingName: string,
  settingValue: ExampleSettingValue,
): OutputValuePair => {
  return {
    name: `--${casing.toKebabCase(settingName)}`,
    value: settingValue,
  };
};

export default toCssVariable;
