import type {
  DecimalsPolicy,
  FormatNumberOptions,
  FormatResult,
} from "./types.js";

/**
 * Default unit suffixes for thousands, millions, billions, trillions.
 *
 * @internal
 */
const DEFAULT_UNITS = ["", "k", "M", "B", "T"] as const;

/**
 * Default maximum number of significant digits to display in the formatted output.
 */
const DEFAULT_MAX_SIGNIFICANT_DIGITS = 3;

/**
 * Formats a positive number using unit suffixes (k, M, B, T) with truncation, not rounding.
 * - Caps at the largest unit as "999T".
 * - By default, shows decimals only when the scaled integer has a single digit (e.g., 1.2k, 1.5M, 1.5T),
 *   otherwise shows no decimals (e.g., 132M, 13B, 999T).
 *
 * This function avoids floating-point artifacts by operating on the integer string representation
 * and trimming fractional zeros.
 *
 * @param value - The numeric value to format. Non-finite or non-positive values return "0".
 * @param options - Optional formatting controls; see {@link FormatNumberOptions}.
 * @returns A human-readable, truncated string representation with an appropriate unit suffix.
 *
 * @example
 * // Defaults (3 significant digits, decimals only for small scaled values)
 * format(1200) // "1.2k"
 * format(132456455) // "132M"
 * format(1500000000) // "1.5B"
 * format(999999999999999) // "999T"
 *
 * @example
 * // Badge-style: show more precision using additional significant digits and always show decimals
 * format(132456455, { significantDigits: 9, decimalsPolicy: "always" }) // "132.456455M"
 * format(13245645512, { significantDigits: 11, decimalsPolicy: "always" }) // "13.245645512B"
 *
 * @example
 * // Custom units
 * format(1500, { units: ["", "K", "M", "G"] }) // "1.5K"
 */
const format = (value: number, options: FormatNumberOptions = {}): string => {
  return formatWithUnit(value, options).displayValue;
};

/**
 * Formats a positive number and returns both the formatted string and unit information.
 * This is useful when you need to know which unit was applied for accessibility purposes.
 *
 * @param value - The numeric value to format. Non-finite or non-positive values return "0".
 * @param options - Optional formatting controls; see {@link FormatNumberOptions}.
 * @returns Object containing the formatted string and unit information.
 */
export const formatWithUnit = (
  value: number,
  options: FormatNumberOptions = {},
): FormatResult => {
  const units = options.units ?? [...DEFAULT_UNITS];
  const maxUnitIndex = units.length - 1;
  const significantDigits = Math.max(
    1,
    options.significantDigits ?? DEFAULT_MAX_SIGNIFICANT_DIGITS,
  );
  const decimalsPolicy: DecimalsPolicy = options.decimalsPolicy ?? "onlySmall";

  if (!Number.isFinite(value)) {
    if (value === Infinity) {
      const lastUnitIndex = units.length - 1;
      const lastUnit = units[lastUnitIndex];
      return {
        displayValue: `999${lastUnit}+`,
        unitSuffix: lastUnit,
        unitIndex: lastUnitIndex,
      };
    } else {
      return { displayValue: "0", unitSuffix: "", unitIndex: 0 };
    }
  }
  if (value <= 0) {
    return { displayValue: "0", unitSuffix: "", unitIndex: 0 };
  }

  // Build from integer string to avoid floating-point artifacts
  const intStr = Math.trunc(value).toString();
  const digitsCount = intStr.length;

  let unitIndex = Math.floor(
    (digitsCount - 1) / DEFAULT_MAX_SIGNIFICANT_DIGITS,
  );
  if (unitIndex > maxUnitIndex) unitIndex = maxUnitIndex;

  // If we're at the max unit and the number exceeds the unit capacity (more than 3 leading digits)
  // cap at 999T (or the last unit suffix provided).
  const leadingDigitsCountRaw =
    digitsCount - unitIndex * DEFAULT_MAX_SIGNIFICANT_DIGITS;
  if (
    unitIndex === maxUnitIndex &&
    leadingDigitsCountRaw > DEFAULT_MAX_SIGNIFICANT_DIGITS
  ) {
    return {
      displayValue: `999${units[unitIndex]}+`,
      unitSuffix: units[unitIndex],
      unitIndex,
    };
  }

  // Determine integer and fractional digit budgets from significantDigits and policy
  const integerDigitsCount = Math.min(
    leadingDigitsCountRaw,
    DEFAULT_MAX_SIGNIFICANT_DIGITS,
  ); // digits before decimal in scaled value

  // Decide how many fractional digits to show
  let fractionalBudget = 0;
  if (decimalsPolicy === "always") {
    fractionalBudget = Math.max(0, significantDigits - integerDigitsCount);
  } else if (decimalsPolicy === "onlySmall") {
    // Show decimals only when scaled integer is a single digit
    if (integerDigitsCount === 1) {
      fractionalBudget = Math.max(0, significantDigits - integerDigitsCount);
    }
  } else {
    fractionalBudget = 0;
  }

  // Extract integer and fractional digits from the compacted number string
  const integerPart = intStr.slice(0, integerDigitsCount);
  let fractionalPart = intStr.slice(
    integerDigitsCount,
    integerDigitsCount + fractionalBudget,
  );

  // Trim trailing zeros in fractional part
  fractionalPart = fractionalPart.replace(/0+$/g, "");

  const showDecimal = fractionalPart.length > 0;
  const valueStr = showDecimal
    ? `${integerPart}.${fractionalPart}`
    : integerPart;

  return {
    displayValue: `${valueStr}${units[unitIndex]}`,
    unitSuffix: units[unitIndex],
    unitIndex,
  };
};

export default format;
