import { clamp, humanizeNumber, pluralize } from "@canonical/utils";
import { useMemo } from "react";
import type { UseBadgeProps, UseBadgeResult } from "../types.js";

// Maximum number of characters to display in a badge before applying overflow strategy
const BADGE_MAX_CHARS = 4;
// Maximum natural value that can be displayed in a badge without overflow (e.g., 999 for 3 chars)
const BADGE_MAX_NATURAL_VAL = 10 ** (BADGE_MAX_CHARS - 1) - 1;

/**
 * A hook to manage the logic for formatting a badge's numeric value and generating appropriate aria-labels.
 */
const useBadge = ({
  value,
  overflowStrategy = "truncate",
  itemOptions,
}: UseBadgeProps): UseBadgeResult => {
  const safeValue = useMemo(() => clamp(value, 0), [value]);

  const displayValue: string = useMemo(() => {
    if (overflowStrategy === "compact") {
      return humanizeNumber(value).displayValue;
    }
    return safeValue > BADGE_MAX_NATURAL_VAL
      ? `${BADGE_MAX_NATURAL_VAL}+`
      : String(safeValue);
  }, [value, safeValue, overflowStrategy]);

  const title: string = useMemo(
    () => `${displayValue} ${pluralize(safeValue, itemOptions)}`,
    [safeValue, displayValue, itemOptions],
  );

  return useMemo(
    () => ({
      displayValue,
      title,
    }),
    [displayValue, title],
  );
};

export default useBadge;
