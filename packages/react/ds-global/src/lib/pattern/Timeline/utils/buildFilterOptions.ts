import type { TimelineFilterOption, TimelineItem } from "../types.js";

/** Unique filter options in first-seen order; label from the first carrier. */
export function buildFilterOptions(
  items: readonly TimelineItem[],
  getValue: (item: TimelineItem) => string | undefined,
  getLabel: (item: TimelineItem) => string | undefined,
): TimelineFilterOption[] {
  const labels = new Map<string, string>();
  for (const item of items) {
    const value = getValue(item);
    if (value === undefined || labels.has(value)) {
      continue;
    }
    labels.set(value, getLabel(item) ?? value);
  }
  return [...labels.entries()].map(([value, label]) => ({ value, label }));
}
