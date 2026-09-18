import { useCallback, useMemo, useState } from "react";
import type {
  TimelineFilterOption,
  TimelineFilterState,
  TimelineItem,
  TimelineSortOrder,
} from "../types.js";
import { buildFilterOptions } from "../utils/buildFilterOptions.js";

type UseTimelineFiltersProps = {
  items: readonly TimelineItem[];
  filters?: TimelineFilterState;
  defaultFilters?: TimelineFilterState;
  onFiltersChange?: (filters: TimelineFilterState) => void;
  sortOrder?: TimelineSortOrder;
  defaultSortOrder?: TimelineSortOrder;
  onSortOrderChange?: (order: TimelineSortOrder) => void;
};

type UseTimelineFiltersResult = {
  actorOptions: TimelineFilterOption[];
  eventOptions: TimelineFilterOption[];
  filters: TimelineFilterState;
  setFilters: (filters: TimelineFilterState) => void;
  sortOrder: TimelineSortOrder;
  setSortOrder: (order: TimelineSortOrder) => void;
  /** Items filtered and sorted per the current state. */
  visible: TimelineItem[];
};

const DEFAULT_SORT_ORDER: TimelineSortOrder = "oldest";

/**
 * Sort by timestamp under the given order. Invalid timestamps sort after
 * valid ones and ties keep input order, both by the recorded index.
 *
 * @note Technical debt, accepted: timestamps sort via `Date.parse`, which is
 * engine-dependent on out-of-range dates (V8/Node returns NaN; JavaScriptCore
 * rolls 2026-02-30 into March) and timezone-dependent on offsetless
 * date-times. Unparseable values already fall back to stable index order, so
 * the residual risk is a wrong *position* for invalid or offsetless input on
 * some engines, not a crash. Resolve by adopting dataviews core's
 * `readInstant` + `isCalendarDate` (calendar-exact, offset-safe instant
 * reading) once the dataviews stack lands and releases; until then feeds
 * should carry standard offset-bearing ISO 8601.
 */
function sortItems(
  items: readonly TimelineItem[],
  order: TimelineSortOrder,
): TimelineItem[] {
  const withIndex = items.map((item, index) => ({
    item,
    index,
    time: Date.parse(item.dateTime),
  }));
  withIndex.sort((a, b) => {
    const aValid = !Number.isNaN(a.time);
    const bValid = !Number.isNaN(b.time);
    if (aValid && bValid) {
      return order === "newest" ? b.time - a.time : a.time - b.time;
    }
    if (aValid !== bValid) {
      return aValid ? -1 : 1;
    }
    return a.index - b.index;
  });
  return withIndex.map((entry) => entry.item);
}

/**
 * Filter and sort state for the data-driven Timeline. Filter options are
 * inferred from the items; all filtering and sorting is client-side.
 */
export function useTimelineFilters({
  items,
  filters,
  defaultFilters,
  onFiltersChange,
  sortOrder,
  defaultSortOrder,
  onSortOrderChange,
}: UseTimelineFiltersProps): UseTimelineFiltersResult {
  const isFiltersControlled = filters !== undefined;
  const isSortControlled = sortOrder !== undefined;
  const [internalFilters, setInternalFilters] = useState<TimelineFilterState>(
    defaultFilters ?? {},
  );
  const [internalSortOrder, setInternalSortOrder] = useState<TimelineSortOrder>(
    defaultSortOrder ?? DEFAULT_SORT_ORDER,
  );

  const activeFilters = isFiltersControlled ? filters : internalFilters;
  const activeSortOrder = isSortControlled ? sortOrder : internalSortOrder;

  const setFilters = useCallback(
    (next: TimelineFilterState) => {
      if (!isFiltersControlled) {
        setInternalFilters(next);
      }
      onFiltersChange?.(next);
    },
    [isFiltersControlled, onFiltersChange],
  );

  const setSortOrder = useCallback(
    (next: TimelineSortOrder) => {
      if (!isSortControlled) {
        setInternalSortOrder(next);
      }
      onSortOrderChange?.(next);
    },
    [isSortControlled, onSortOrderChange],
  );

  const actorOptions = useMemo(
    () =>
      buildFilterOptions(
        items,
        (item) => item.actorId,
        (item) => item.actorName,
      ),
    [items],
  );
  const eventOptions = useMemo(
    () =>
      buildFilterOptions(
        items,
        (item) => item.eventType,
        (item) => item.eventLabel,
      ),
    [items],
  );

  const visible = useMemo(() => {
    const filtered = items.filter(
      (item) =>
        (!activeFilters.actorId || item.actorId === activeFilters.actorId) &&
        (!activeFilters.eventType ||
          item.eventType === activeFilters.eventType),
    );
    return sortItems(filtered, activeSortOrder);
  }, [items, activeFilters, activeSortOrder]);

  return {
    actorOptions,
    eventOptions,
    filters: activeFilters,
    setFilters,
    sortOrder: activeSortOrder,
    setSortOrder,
    visible,
  };
}
