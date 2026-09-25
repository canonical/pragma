import { useCallback, useState } from "react";
import type { TimelineCollapsingMethod } from "../types.js";

type UseTimelineExpansionProps = {
  /** Total number of events in the (filtered, sorted) list. */
  count: number;
  method?: TimelineCollapsingMethod;
  /** Events visible on load. Default 8. */
  initialVisible?: number;
  /** Events revealed per "Show more". Default 4. */
  step?: number;
};

type UseTimelineExpansionResult = {
  /** Events visible at the top of the list (middle method only). */
  topCount: number;
  /** Events visible from the end of the top slice. */
  bottomCount: number;
  hiddenCount: number;
  /** Where the expansion indicator sits; null when nothing is hidden. */
  indicatorPosition: "bottom" | "middle" | null;
  /** The resolved step, for the "Show N more" label. */
  step: number;
  showMore: () => void;
  showAll: () => void;
};

/**
 * Expansion state for the long-timeline collapsing methods. "bottom" shows
 * the first {initialVisible} events; "middle" shows the top and bottom halves.
 */ export function useTimelineExpansion({
  count,
  method = "bottom",
  initialVisible = 8,
  step = 4,
}: UseTimelineExpansionProps): UseTimelineExpansionResult {
  const [revealed, setRevealed] = useState(0);

  const showMore = useCallback(() => {
    setRevealed((current) => current + step);
  }, [step]);

  const showAll = useCallback(() => {
    setRevealed(Number.POSITIVE_INFINITY);
  }, []);

  const topCount =
    method === "middle"
      ? Math.min(Math.ceil(Math.max(0, initialVisible) / 2), count)
      : 0;
  const initialBottom =
    method === "none"
      ? count
      : method === "middle"
        ? Math.max(0, Math.floor(Math.max(0, initialVisible) / 2))
        : Math.max(0, initialVisible);
  const bottomCount = Math.max(
    0,
    Math.min(initialBottom + revealed, count - topCount),
  );
  const hiddenCount = Math.max(0, count - topCount - bottomCount);
  const indicatorPosition =
    method === "none" || hiddenCount === 0
      ? null
      : method === "middle"
        ? "middle"
        : "bottom";

  return {
    topCount,
    bottomCount,
    hiddenCount,
    indicatorPosition,
    step,
    showMore,
    showAll,
  };
}
