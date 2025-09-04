import {
  type HumanizeNumberOptions,
  humanizeNumber,
  pluralize,
} from "@canonical/utils";
import { useMemo } from "react";
import type { UseBadgeProps, UseBadgeResult } from "../types.js";

const DEFAULT_HUMANIZE_OPTIONS: HumanizeNumberOptions = {
  humanizeType: "clamp",
  clampOptions: { min: 0, max: 999 },
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
  const displayValue: string = useMemo(() => {
    const options = { ...DEFAULT_HUMANIZE_OPTIONS, ...humanizeOptions };

    return humanizeNumber(value, options).displayValue;
  }, [value, humanizeOptions]);

  const title: string = useMemo(
    () => `${displayValue} ${pluralize(value, pluralizeOptions)}`,
    [value, displayValue, pluralizeOptions],
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
