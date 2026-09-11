import type { CollectionCoordinatorState } from "@canonical/dataviews-core";
import type { DataTableStatus } from "./types.js";

/**
 * What the table says instead of its rows or beside them, or null when the
 * rows speak for themselves.
 *
 * The cases stay distinct so the table never says "no results" about a
 * collection it failed to read, or "no data" about a query that simply
 * matched nothing. Retained rows keep rendering: rows an earlier query
 * produced are shown as such beside the reason the current one failed,
 * while rows kept through a failed refresh of the same query still answer
 * it, so they are shown as they are and the error stays in `lastError`.
 */
export default function tableStatus(
  state: CollectionCoordinatorState<object>,
): DataTableStatus | null {
  const { result } = state;
  if (result.rows !== null && result.rows.length > 0) {
    return result.status === "stale" && result.lastError !== null
      ? { kind: "stale", reason: result.lastError }
      : null;
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

/** A status's reason, where its kind has one. */
const reasonOf = (status: DataTableStatus): string | undefined =>
  "reason" in status ? status.reason : undefined;

/** Two statuses say the same thing: the same kind, for the same reason. */
export const sameStatus = (
  a: DataTableStatus | null,
  b: DataTableStatus | null,
): boolean =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.kind === b.kind &&
    reasonOf(a) === reasonOf(b));
