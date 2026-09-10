import type { CollectionCoordinatorState } from "@canonical/dataviews-core";
import type { DataTableStatus } from "./types.js";

/**
 * Why a table has no rows to render, or null when it has some.
 *
 * The cases stay distinct so the table never says "no results" about a
 * collection it failed to read, or "no data" about a query that simply
 * matched nothing. Retained rows keep rendering: a failed refresh reports
 * its error through the root's status surface, not by blanking the table.
 */
export default function tableStatus(
  state: CollectionCoordinatorState<object>,
): DataTableStatus | null {
  const { result } = state;
  if (result.rows !== null && result.rows.length > 0) {
    return null;
  }
  if (result.lastError !== null) {
    return { kind: "error", reason: result.lastError };
  }
  if (result.rows === null) {
    return { kind: "loading" };
  }
  const filtered = state.slice.filter.length > 0 || state.slice.search !== null;
  return { kind: filtered ? "no-results" : "no-data" };
}
