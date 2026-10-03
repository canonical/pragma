import type { TimelineSortOrder, TimelineUrlState } from "../types.js";

const SORT_ORDERS: readonly string[] = ["newest", "oldest"];

/** The first non-empty value of `key`, or undefined when absent or empty. */
function readValue(params: URLSearchParams, key: string): string | undefined {
  const value = params.get(key);
  return value === null || value === "" ? undefined : value;
}

/**
 * Read Timeline's filters and sort order from query params. Only the keys
 * under `prefix` (`<prefix>.actor`, `<prefix>.event`, `<prefix>.sort`) are
 * read. An empty value, or a sort order other than `newest` or `oldest`,
 * reads as unset, so the caller's default applies. A repeated key reads its
 * first value.
 */
export default function parseTimelineUrlParams(
  params: URLSearchParams,
  prefix: string,
): TimelineUrlState {
  const sort = readValue(params, `${prefix}.sort`);
  return {
    filters: {
      actorId: readValue(params, `${prefix}.actor`),
      eventType: readValue(params, `${prefix}.event`),
    },
    sortOrder:
      sort !== undefined && SORT_ORDERS.includes(sort)
        ? (sort as TimelineSortOrder)
        : undefined,
  };
}
