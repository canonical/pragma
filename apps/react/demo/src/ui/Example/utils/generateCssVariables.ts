import { casing } from "@canonical/utils";
import type { AllExampleSettings } from "../types.js";

/**
 * Generate CSS variables from the settings of an example
 * @param settings The settings of an example
 */
const generateCssVariables = (
  settings: AllExampleSettings,
): Record<string, string | number | undefined> => {
  const cssVars: Record<string, string | number | undefined> = {};
  for (const settingName in settings) {
    const setting = settings[settingName as keyof AllExampleSettings];
    if (!setting || setting.disableFormats?.css || setting.value === undefined)
      continue;
    const cssVarName = `--${casing.toKebabCase(settingName)}`;
    cssVars[cssVarName] = `${setting.value}${setting.cssUnit || ""}`;
  }
  return cssVars;
};

export default generateCssVariables;
