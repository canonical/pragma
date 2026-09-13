/**
 * Delivery fixtures for tests: one exact count and one delivered page, the
 * shapes a test hands the provider when it completes a request by hand.
 * A source's declaration is built the way an application builds one, with
 * `declareCapabilities` against the test's own schema; `COUNTED_EXACTLY`
 * is the counts block complete local input declares.
 */

import {
  type Completion,
  type Count,
  type CountCapabilities,
  createPage,
} from "@canonical/dataviews-core";

/** All three counts answered exactly, as complete local input answers them. */
export const COUNTED_EXACTLY: CountCapabilities = Object.freeze({
  pageable: "exact",
  matched: "exact",
  total: "exact",
});

/** One count a source claims exactly. */
export const countExactly = (value: number): Count => ({
  kind: "exact",
  value,
});

/** A delivered page of rows, counted exactly and grouped by nothing. */
export const deliverRows = <TRow extends object>(
  rows: readonly TRow[],
): Completion<TRow> => ({
  status: "succeeded",
  page: createPage({ rows, matched: rows.length, total: rows.length }),
});
