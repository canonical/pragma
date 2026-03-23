import type { RelativeTimeFormatValue } from "../types.js";
import { units } from "./constants.js";

/**
 * Computes a relative time (value + unit) and milliseconds until it changes.
 * Chooses the largest unit with ms <= |elapsed|.
 * `nextUpdateIn` is the ms until the value/unit would differ.
 *
 * @param elapsed Milliseconds relative to now (+future, -past).
 * Must be >= the smallest unit threshold (1000ms); sub-threshold values
 * should be handled by the caller before invoking this function.
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
  const match = units.find(([_, millis]) => absElapsed >= millis);
  if (!match) {
    throw new Error(
      `elapsed ${elapsed}ms is below the smallest unit threshold`,
    );
  }
  const [unit, millis] = match;
  const value = Math.trunc(elapsed / millis);
  const nextUpdateIn = millis - (absElapsed % millis);
  return { value, unit, nextUpdateIn };
}
