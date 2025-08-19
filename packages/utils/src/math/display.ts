import type { DisplayNumberOptions, DisplayNumberResult } from "./types.js";

const MIN_MAX_LENGTH = 3;

/**
 * Gets the locale-aware decimal separator for the current system locale.
 * Uses a test decimal number to determine what character is used to separate
 * the integer and fractional parts in the current locale.
 *
 * @returns The decimal separator character (e.g., "." for US, "," for German)
 *
 * @example
 * ```typescript
 * getDecimalSeparator()  // "." in US locale
 * getDecimalSeparator()  // "," in German locale
 * ```
 */
const getDecimalSeparator = (): string => {
  const testDecimal = (1.5).toLocaleString();
  return testDecimal.replace(/[0-9]/g, "") || ".";
};

/**
 * Creates an overflow indicator that fits within maxLength, using locale-aware formatting.
 * Generates the largest possible number that fits in the available space, followed by a "+" sign.
 * internal helper function - used by {@link displayNumberWithUnit} for overflow scenarios
 *
 * @param maxLength - Maximum character length for the overflow indicator
 * @param unit - Optional unit suffix to include in the overflow (e.g., "k", "M")
 * @returns Overflow indicator string using locale formatting when possible
 *
 * @example
 * ```typescript
 * createOverflow(4, "k")  // "99k+" (US locale)
 * createOverflow(5, "M")  // "999M+"
 * createOverflow(3)       // "99+"
 * ```
 */
const createOverflow = (maxLength: number, unit: string = ""): string => {
  // Remove unit if it doesn't fit (need space for at least one digit + "+")
  if (unit.length + 1 >= maxLength) {
    unit = "";
  }
  const availableForNumber = maxLength - unit.length - 1; // -1 for "+" character

  // Generate the largest number that fits: 10^n - 1 (e.g., 999 for 3 digits)
  let maxNumber = 10 ** availableForNumber - 1;
  let formattedNumber = maxNumber.toLocaleString();

  // If locale formatting adds separators that make it too long,
  // progressively reduce digits until it fits (e.g., 9,999 → 999 if space is tight)
  while (formattedNumber.length > availableForNumber && maxNumber >= 10) {
    maxNumber = Math.floor(maxNumber / 10);
    formattedNumber = maxNumber.toLocaleString();
  }

  return `${formattedNumber}${unit}+`;
};

/**
 * Truncates a numeric value to fit within a specified character length, preserving as much
 * precision as possible. Uses floor-based truncation to avoid rounding carry-over that could
 * increase the integer part length and break character constraints.
 *
 * @param number - The numeric value to truncate
 * @param maxLength - Maximum characters allowed for the output string
 * @returns String representation of the number, truncated to fit within maxLength
 * @see {@link displayNumberWithUnit} Called when formatting scaled values for unit display
 *
 * @example
 * ```typescript
 * truncateToLength(1.234, 4)   // "1.23"
 * truncateToLength(12.34, 3)   // "12"
 * truncateToLength(1.999, 4)   // "1.99" (floor behavior prevents "2.00")
 * ```
 */
const truncateToLength = (number: number, maxLength: number): string => {
  const intPartStr = Math.trunc(number).toString();

  // If integer part is too long, truncate it (extreme case)
  if (intPartStr.length > maxLength) {
    return intPartStr.slice(0, maxLength);
  }

  // If no room for decimal point + at least one decimal, return integer only
  if (maxLength < intPartStr.length + 2) {
    return intPartStr;
  }

  // Calculate maximum decimal places that fit
  const maxDecimals = maxLength - intPartStr.length - 1; // -1 for decimal point
  const formatted = number.toFixed(maxDecimals);

  // Critical: Check if toFixed() rounding caused integer part to grow (e.g., 1.999 → 2.000)
  const formattedIntPartStr = Math.trunc(parseFloat(formatted)).toString();
  if (formattedIntPartStr.length > intPartStr.length) {
    const maxSafeDecimals = maxLength - intPartStr.length - 1;
    if (maxSafeDecimals >= 0) {
      // Use floor-based truncation to prevent carry-over
      const multiplier = 10 ** maxSafeDecimals;
      const truncatedValue = Math.floor(number * multiplier) / multiplier;
      return truncatedValue.toFixed(maxSafeDecimals);
    }
    return intPartStr;
  }

  // Handle edge case where parseFloat().toString() changes length (removes trailing zeros)
  if (parseFloat(formatted).toString().length > maxLength) {
    if (maxDecimals > 0) {
      // Reduce precision by one decimal place
      const reducedPrecision = parseFloat(number.toFixed(maxDecimals - 1));
      return reducedPrecision.toString();
    }
    return intPartStr;
  }

  // Return the cleanest representation (parseFloat removes trailing zeros)
  return parseFloat(formatted).toString();
};

/**
 * Displays a number formatted to fit within a maximum character length.
 * This is a convenience function that returns only the display string from displayNumberWithUnit.
 *
 * @param value - The numeric value to display. Non-finite or negative values return "0"
 * @param options - Optional formatting controls including maxLength, units, and overflow strategy
 * @returns A formatted string representation that fits within maxLength
 *
 * @example
 * ```typescript
 * displayNumber(1500)                           // "1.5k"
 * displayNumber(1500, { maxLength: 3 })         // "1k+"
 * displayNumber(1500, { overflowStrategy: "truncate" }) // "999+"
 * displayNumber(1234567, { maxLength: 8 })      // "1.234567M"
 * ```
 */
export const displayNumber = (
  value: number,
  options: DisplayNumberOptions = {},
): string => {
  return displayNumberWithUnit(value, options).displayValue;
};

/**
 * Displays a number formatted to fit within a maximum character length, with comprehensive
 * unit suffix support and overflow handling. This is the primary formatting function that
 * provides full control and metadata about the formatting decisions made.
 *
 * The function supports two overflow strategies:
 * - "compact": Uses unit suffixes (k, M, B, T) to represent large numbers compactly
 * - "truncate": Shows maximum digits possible with a "+" indicator for overflow
 *
 * @param value - The numeric value to display. Non-finite or negative values return "0"
 * @param options - Optional formatting controls
 * @param options.maxLength - Maximum character length for output (minimum 3, default 4)
 * @param options.units - Array of unit suffixes (default ["", "k", "M", "B", "T"])
 * @param options.overflowStrategy - How to handle values that don't fit ("compact" or "truncate")
 * @returns Object containing the formatted string, unit suffix used, and unit index
 *
 * @example
 * ```typescript
 * // Basic usage
 * displayNumberWithUnit(1500)
 * // { displayValue: "1.5k", unitSuffix: "k", unitIndex: 1 }
 *
 * // Compact strategy (default)
 * displayNumberWithUnit(1500, { maxLength: 3 })
 * // { displayValue: "1k+", unitSuffix: "k", unitIndex: 1 }
 *
 * // Truncate strategy
 * displayNumberWithUnit(1500, { maxLength: 4, overflowStrategy: "truncate" })
 * // { displayValue: "999+", unitSuffix: "", unitIndex: 0 }
 *
 * // Custom units
 * displayNumberWithUnit(1500, { units: ["", "KB", "MB"] })
 * // { displayValue: "1.5KB", unitSuffix: "KB", unitIndex: 1 }
 *
 * // Precision handling
 * displayNumberWithUnit(132456789, { maxLength: 8 })
 * // { displayValue: "132.45M+", unitSuffix: "M", unitIndex: 2 }
 * ```
 */
export const displayNumberWithUnit = (
  value: number,
  options: DisplayNumberOptions = {},
): DisplayNumberResult => {
  const { units = ["", "k", "M", "B", "T"], overflowStrategy = "compact" } =
    options;
  let { maxLength = 4 } = options;

  // Enforce minimum length to ensure we can always display at least a digit, a unit, and an overflow character +
  if (maxLength < MIN_MAX_LENGTH) {
    console.error(
      `maxLength must be at least ${MIN_MAX_LENGTH}. It is being automatically adjusted to ${MIN_MAX_LENGTH}.`,
    );
    maxLength = MIN_MAX_LENGTH;
  }

  // Pre-calculate fallback unit for extreme overflow scenarios
  const lastUnitIndex = Math.max(0, units.length - 1);
  const lastUnit = units[lastUnitIndex] ?? "";

  if (value === Infinity) {
    return {
      displayValue: createOverflow(maxLength, lastUnit),
      unitSuffix: lastUnit,
      unitIndex: lastUnitIndex,
    };
  }
  // Normalize invalid/negative values to "0"
  if (!Number.isFinite(value) || value < 0) {
    return { displayValue: "0", unitSuffix: "", unitIndex: 0 };
  }
  if (value === 0) {
    return { displayValue: "0", unitSuffix: "", unitIndex: 0 };
  }

  if (value > 0 && value < 1) {
    const str = value.toString();
    if (str.length <= maxLength) {
      return { displayValue: str, unitSuffix: "", unitIndex: 0 };
    }
    // Try progressively shorter decimal representations with "+" indicator
    const spaceForNum = maxLength - 1; // Reserve 1 char for "+"
    for (let p = spaceForNum - 2; p >= 0; p--) {
      // subtract by 2 because we need space for a decimal point
      const fixed = value.toFixed(p);
      if (fixed.length <= spaceForNum) {
        // Avoid showing "0+" if rounding makes it zero
        if (parseFloat(fixed) === 0) break;
        return { displayValue: `${fixed}+`, unitSuffix: "", unitIndex: 0 };
      }
    }
    return { displayValue: "0+", unitSuffix: "", unitIndex: 0 };
  }

  const intValue = Math.trunc(value);
  const intLocaleString = intValue.toLocaleString();
  const valueHasDecimal = intValue !== value;

  // If it's a perfect integer and fits with locale formatting, use it
  if (!valueHasDecimal && intLocaleString.length <= maxLength) {
    return { displayValue: intLocaleString, unitSuffix: "", unitIndex: 0 };
  }

  // If it's a decimal and the full locale formatting fits, use it
  if (valueHasDecimal) {
    const decimalSeparator = getDecimalSeparator();
    const decimalPart = value.toString().split(".")[1] || "";
    const fullLocaleStr = decimalPart
      ? `${intLocaleString}${decimalSeparator}${decimalPart}`
      : intLocaleString;

    // If full decimal fits exactly, prefer locale formatting
    if (fullLocaleStr.length <= maxLength) {
      return { displayValue: fullLocaleStr, unitSuffix: "", unitIndex: 0 };
    }
  }

  if (overflowStrategy === "truncate") {
    // Try to show decimals if integer part fits
    if (valueHasDecimal && intLocaleString.length < maxLength) {
      const decimalSeparator = getDecimalSeparator();
      const decimalPart = value.toString().split(".")[1] || "";
      const fullLocaleStr = decimalPart
        ? `${intLocaleString}${decimalSeparator}${decimalPart}`
        : intLocaleString;

      // If the full number fits, show it as-is
      if (fullLocaleStr.length <= maxLength) {
        return { displayValue: fullLocaleStr, unitSuffix: "", unitIndex: 0 };
      }

      // Try progressively shorter truncated versions with "+" indicator
      for (
        let targetLength = maxLength - 1; // Reserve 1 char for "+"
        targetLength >= intLocaleString.length + 2; // Need space for decimal point
        targetLength--
      ) {
        if (fullLocaleStr.length > targetLength) {
          const truncated = fullLocaleStr.slice(0, targetLength);
          // Remove trailing decimal separator if it exists (locale-aware)
          const decimalSeparatorRegex = new RegExp(`\\${decimalSeparator}$`);
          const cleaned = truncated.replace(decimalSeparatorRegex, "");
          if (cleaned.length > 0) {
            return {
              displayValue: `${cleaned}+`,
              unitSuffix: "",
              unitIndex: 0,
            };
          }
        }
      }
    }

    // Default truncate behavior: Show maximum digits that fit
    return {
      displayValue: createOverflow(maxLength),
      unitSuffix: "",
      unitIndex: 0,
    };
  }

  // Compact mode: use unit suffixes to represent large numbers ===

  // Determine the best-fitting unit for fallback scenarios
  let bestFitUnitIndex = 0;
  for (let i = lastUnitIndex; i > 0; i--) {
    if (value >= 1000 ** i) {
      bestFitUnitIndex = i;
      break;
    }
  }
  const bestFitUnit = units[bestFitUnitIndex] ?? "";

  // Iterate through units in reverse order to find the best fit
  for (let i = lastUnitIndex; i > 0; i--) {
    const unit = units[i] ?? "";

    // Min value needed for this unit to be applicable
    // For example, for "k" (1000), we need at least 1000 to display "1k"
    const minValueForUnit = 1000 ** i;

    if (value < minValueForUnit) continue;

    // scales the value relative to the unit. For example, if the unit is "k" (1000), 1500 becomes 1.5
    const scaledValue = value / minValueForUnit;

    // If the scaled value is too small to fit in the available space, skip this unit
    const availableLength = maxLength - unit.length;
    if (!availableLength) continue;

    const intPartStr = Math.trunc(scaledValue).toString();
    if (intPartStr.length > availableLength) continue;

    let numStr = truncateToLength(scaledValue, availableLength);

    // Use a small epsilon for floating point comparison to determine exactness
    const isExact =
      Math.abs(parseFloat(numStr) * minValueForUnit - value) < 1e-9;

    if (isExact) {
      return {
        displayValue: `${numStr}${unit}`,
        unitSuffix: unit,
        unitIndex: i,
      };
    }

    const spaceForNum = availableLength - 1;
    if (intPartStr.length > spaceForNum) continue;

    if (numStr.length > spaceForNum) {
      numStr = numStr.slice(0, spaceForNum);
    }

    // Remove trailing decimal point if it exists (note: this is from truncateToLength which uses . for decimals)
    numStr = numStr.replace(/\.$/, "");
    return {
      displayValue: `${numStr}${unit}+`,
      unitSuffix: unit,
      unitIndex: i,
    };
  }

  // No unit fits - try to show decimal precision if possible
  if (valueHasDecimal && intLocaleString.length < maxLength) {
    const decimalSeparator = getDecimalSeparator();
    const decimalPart = value.toString().split(".")[1] || "";
    const fullLocaleStr = decimalPart
      ? `${intLocaleString}${decimalSeparator}${decimalPart}`
      : intLocaleString;

    // If full decimal fits, show it exactly
    if (fullLocaleStr.length <= maxLength) {
      return { displayValue: fullLocaleStr, unitSuffix: "", unitIndex: 0 };
    }

    // Try to show truncated decimal with "+" if there's room
    const spaceForNum = maxLength - 1; // Reserve 1 char for "+"
    if (intLocaleString.length + 2 <= spaceForNum) {
      // Need space for decimal separator and at least 1 decimal
      for (
        let precision = spaceForNum - intLocaleString.length - 1;
        precision >= 1;
        precision--
      ) {
        const truncatedStr = `${intLocaleString}${decimalSeparator}${decimalPart.slice(0, precision)}`;
        if (truncatedStr.length <= spaceForNum) {
          return {
            displayValue: `${truncatedStr}+`,
            unitSuffix: "",
            unitIndex: 0,
          };
        }
      }
    }

    // Fallback to integer with "+"
    return {
      displayValue: `${intLocaleString}+`,
      unitSuffix: "",
      unitIndex: 0,
    };
  }

  // An integer of all "9"s, followed by a "+" sign, up to `maxLength`
  // This is the fallback for extreme overflow scenarios
  return {
    displayValue: createOverflow(maxLength, bestFitUnit),
    unitSuffix: bestFitUnit,
    unitIndex: bestFitUnitIndex,
  };
};

export default displayNumber;
