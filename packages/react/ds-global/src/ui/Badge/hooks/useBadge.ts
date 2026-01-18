import {
  type HumanizeNumberOptions,
  humanizeNumber,
  pluralize,
} from "@canonical/utils";
import { useMemo } from "react";
import type { UseBadgeProps, UseBadgeResult } from "../types.js";

const DEFAULT_HUMANIZE_OPTIONS: HumanizeNumberOptions = {
  overflowIndicator: "+",
};

/**
 * A hook to manage a Badge's internal state
 */
const useBadge = ({
  value,
  humanizeOptions,
  pluralizeOptions,
}: UseBadgeProps): UseBadgeResult => {
  // Badge values must be at least 0 to preserve their purpose as natural number indicators
  const valueToUse = useMemo(() => Math.max(0, value), [value]);

  const displayValue: string = useMemo(() => {
    const options = { ...DEFAULT_HUMANIZE_OPTIONS, ...humanizeOptions };

    return humanizeNumber(valueToUse, options).displayValue;
  }, [valueToUse, humanizeOptions]);

  const title: string = useMemo(
    () => `${displayValue} ${pluralize(valueToUse, pluralizeOptions)}`,
    [valueToUse, displayValue, pluralizeOptions],
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
