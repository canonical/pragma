import type { DisplayStatus } from "@canonical/dataviews-core";

/**
 * The text shown for each status when no renderer is supplied. A switch
 * over every status, so one the core adds is a compile error here until
 * it has words.
 */
export default function describeStatus(status: DisplayStatus): string {
  switch (status.status) {
    case "pending":
      return "Loading…";
    case "regrouping":
      return "Regrouping…";
    case "failed":
      return `These rows could not be loaded: ${status.reason}`;
    case "refresh-failed":
      return `These rows could not be refreshed: ${status.reason}`;
    case "stale":
      return `These rows do not match the current query: ${status.reason}`;
    case "no-results":
      return "No rows match this query.";
    case "no-data":
      return "There is nothing here yet.";
  }
}
