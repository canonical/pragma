import type { TimelineUrlState } from "../types.js";

/**
 * Return new query params that carry Timeline's filters and sort order under
 * `prefix` and keep every other param of `current` untouched, repeated keys
 * and order included. An unset or empty value removes its key. `current` is
 * not modified.
 */
export default function mergeTimelineUrlParams(
  current: URLSearchParams,
  state: TimelineUrlState,
  prefix: string,
): URLSearchParams {
  const next = new URLSearchParams(current);
  const entries: [string, string | undefined][] = [
    [`${prefix}.actor`, state.filters.actorId],
    [`${prefix}.event`, state.filters.eventType],
    [`${prefix}.sort`, state.sortOrder],
  ];
  for (const [key, value] of entries) {
    if (value === undefined || value === "") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
  }
  return next;
}
