import type { DataTableStatus } from "./types.js";

/** The text shown for each status when no renderer is supplied. */
export default function defaultStatusText(status: DataTableStatus): string {
  switch (status.kind) {
    case "loading":
      return "Loading…";
    case "error":
      return status.reason;
    case "stale":
      return `These rows do not match the current query: ${status.reason}`;
    case "no-results":
      return "No rows match this query.";
    case "no-data":
      return "There is nothing here yet.";
  }
}
