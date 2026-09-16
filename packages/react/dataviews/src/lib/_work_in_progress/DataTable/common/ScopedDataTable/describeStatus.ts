import type {
  DataViewsMessages,
  DisplayStatus,
} from "@canonical/dataviews-core";

/**
 * The text shown for each status when no renderer is supplied, in the table's
 * words. A switch over every status, so one the core adds is a compile error
 * here until it has a message.
 */
export default function describeStatus(
  status: DisplayStatus,
  messages: DataViewsMessages,
): string {
  switch (status.status) {
    case "pending":
      return messages.statusPending;
    case "regrouping":
      return messages.statusRegrouping;
    case "failed":
      return messages.statusFailed(status.reason);
    case "refresh-failed":
      return messages.statusRefreshFailed(status.reason);
    case "stale":
      return messages.statusStale(status.reason);
    case "no-results":
      return messages.statusNoResults;
    case "no-data":
      return messages.statusNoData;
  }
}
