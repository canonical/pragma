import type { ExampleControl, ExampleOutputFormat } from "../../types.js";
import css from "./css.js";
import type {
  AllOutput,
  OutputFormatTransformer,
  OutputValues,
} from "./types.js";

/**
 * Mapping of out formats to output generators
 */
const outputGenerators: {
  [key in ExampleOutputFormat]: OutputFormatTransformer;
} = {
  css,
};

/**
 * Generate output values for a specific format
 * @param controls The controls to generate output for
 * @param format The format to generate output for
 */
const generateOutput = (
  controls: ExampleControl[],
  format: ExampleOutputFormat,
): OutputValues => {
  const result: OutputValues = {};
  for (const control of controls) {
    if (
      !control ||
      control.value === undefined ||
      control.disabledOutputFormats?.[format]
    ) {
      continue;
    }
    // Apply output transformer if available
    const { transformer, value: rawValue } = control;
    const finalValue = transformer ? transformer(rawValue) : rawValue;
    const output = outputGenerators[format](control.name, finalValue);
    result[output.name] = output.value;
  }
  return result;
};

/**
 * Generate all output formats for the given controls
 * @param controls The controls to generate output for
 */
const generateAllOutput = (controls: ExampleControl[]): AllOutput => {
  return {
    css: generateOutput(controls, "css"),
  };
};

export default generateAllOutput;
