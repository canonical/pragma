import type { DataViewsState } from "../coordinator/index.js";
import type { ResultProblem } from "../result/index.js";
import type { DisplayStatus } from "./types.js";

/** One problem as the reason shown above or in place of the rows. */
const describeProblem = (problem: ResultProblem): string =>
  problem.status === "refused"
    ? problem.refusals.map((refusal) => refusal.reason).join("; ")
    : problem.failure.reason;

/**
 * What the table says instead of its rows or above them, or null when the
 * rows speak for themselves. Decided once, from the published state, so
 * every binding says the same thing.
 *
 * The cases stay distinct so the table never says "no results" about a
 * collection it failed to read, or "no data" about a query that simply
 * matched nothing. Retained rows keep rendering: rows an earlier query
 * produced are shown as stale under the reason the current one failed, and
 * rows that still answer the query, whose refresh failed, are shown under
 * that reason too — saying nothing there would hide the failure entirely.
 * The coordinator has already told the two apart; this reads its answer.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function resolveDisplayStatus(
  state: DataViewsState<object>,
): DisplayStatus | null {
  const { result } = state;
  const reason =
    result.problem === null ? null : describeProblem(result.problem);
  if (result.rows !== null && result.rows.length > 0) {
    if (reason === null) {
      return null;
    }
    return result.status === "stale"
      ? { status: "stale", reason }
      : { status: "refresh-failed", reason };
  }
  if (reason !== null) {
    return { status: "failed", reason };
  }
  // No rows yet, or an earlier query's empty page: neither says anything
  // about the query now asked, so nothing is claimed until the source
  // answers it.
  if (result.rows === null || !state.resultMatchesQuery) {
    return { status: "pending" };
  }
  const filtered =
    state.slice.filter.length > 0 ||
    (state.slice.search !== null && state.slice.search !== "");
  return { status: filtered ? "no-results" : "no-data" };
}
