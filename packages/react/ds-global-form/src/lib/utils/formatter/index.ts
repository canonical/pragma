// Value formatting: the model/view split shared by any input whose displayed
// string is not the string it submits. `Formatter` is the contract; the helpers
// below cover the fixed-pattern case.

export { default as applyPattern } from "./applyPattern.js";
export { default as createFormatterRegisterOptions } from "./createFormatterRegisterOptions.js";
export { default as createPatternFormatter } from "./createPatternFormatter.js";
export { default as stripToDigits } from "./stripToDigits.js";
export type { Formatter } from "./types.js";
