import type { CollectionState, ResultProblem } from "@canonical/dataviews-core";
import type { DataTableStatus } from "./types.js";

/** One problem as the sentence shown beside or in place of the rows. */
const describeError = (problem: ResultProblem): string =>
  problem.status === "refused"
    ? problem.refusals.map((refusal) => refusal.reason).join("; ")
    : problem.failure.reason;

/**
 * What the table says instead of its rows or beside them, or null when the
 * rows speak for themselves.
 *
 * The cases stay distinct so the table never says "no results" about a
 * collection it failed to read, or "no data" about a query that simply
 * matched nothing. Retained rows keep rendering: rows an earlier query
 * produced are shown as stale beside the reason the current one failed, and
 * rows that still answer the query, whose refresh failed, are shown beside
 * that reason too — saying nothing there would hide the failure entirely.
 */
export default function deriveTableStatus(
  state: CollectionState<object>,
): DataTableStatus | null {
  const { result } = state;
  const reason = result.problem === null ? null : describeError(result.problem);
  if (result.rows !== null && result.rows.length > 0) {
    if (reason === null) {
      return null;
    }
    // A problem standing over rows is one of exactly two things, and the
    // coordinator has already decided which: an earlier query produced the
    // rows, or a refresh of the query they answer failed.
    return result.status === "stale"
      ? { status: "stale", reason }
      : { status: "refresh-failed", reason };
  }
  if (reason !== null) {
    return { status: "failed", reason };
  }
  if (result.rows === null) {
    return { status: "loading" };
  }
  const filtered = state.slice.filter.length > 0 || state.slice.search !== null;
  return { status: filtered ? "no-results" : "no-data" };
}
