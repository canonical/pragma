import type { SortDirection } from "@canonical/dataviews-core";

/**
 * The word a sort direction reads as, in what the table and the sort panel
 * say about an ordering: "ascending" or "descending".
 */
export default function describeSortDirection(
  direction: SortDirection,
): string {
  return direction === "asc" ? "ascending" : "descending";
}
