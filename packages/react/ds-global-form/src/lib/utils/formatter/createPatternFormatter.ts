import applyPattern from "./applyPattern.js";
import stripToDigits from "./stripToDigits.js";
import type { Formatter } from "./types.js";

/**
 * Build a {@link Formatter} for a fixed digit-grouping pattern — the common
 * case, where the separators sit at the same offsets whatever the value is.
 *
 * The pattern uses `#` as a digit slot and treats any other character as a
 * literal separator, so `"(###) ###-####"` groups ten digits as
 * `"(555) 123-4567"`. With no pattern the formatter still strips the value to
 * digits, which is how a field expresses "normalise but do not decorate".
 *
 * @example
 *   const formatter = createPatternFormatter("(###) ###-####");
 *   formatter.format("5551234567"); // "(555) 123-4567"
 *   formatter.parse("(555) 123-4567"); // "5551234567"
 *
 * @note Pure — the returned formatter's halves are pure too.
 */
export default function createPatternFormatter(pattern?: string): Formatter {
  return {
    format: (model: string) => applyPattern(model, pattern),
    parse: stripToDigits,
  };
}
