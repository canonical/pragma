import type { RelativeTimeFormatValue } from "../types.js";
import { units } from "./constants.js";

/**
 * Computes a relative time (value + unit) and milliseconds until it changes.
 * Chooses the largest unit with ms <= |elapsed|.
 * `nextUpdateIn` is the ms until the value/unit would differ.
 *
 * @param elapsed Milliseconds relative to now (+future, -past).
 *
 * @example
 * getOptimalRelativeTimeFormatValue(-90 * 60 * 1000);
 * // { value: -1, unit: "hour", nextUpdateIn: 1800000 }
 */
export function getOptimalRelativeTimeFormatValue(
  elapsed: number,
): RelativeTimeFormatValue & {
  nextUpdateIn: number;
} {
  const absElapsed = Math.abs(elapsed);
  const match =
    units.find(([_, millis]) => absElapsed >= millis) ??
    units[units.length - 1];
  const [unit, millis] = match;
  const value = Math.trunc(elapsed / millis);
  const nextUpdateIn = millis - (absElapsed % millis);
  return { value, unit, nextUpdateIn };
}
