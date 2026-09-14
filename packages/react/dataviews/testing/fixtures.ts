/**
 * Delivery fixtures for tests: one exact count, one page and one delivered
 * page, the shapes a test hands a manual source when it answers a request
 * by hand. A source's declaration is built the way an application builds
 * one, with `declareCapabilities` against the test's own collection;
 * `COUNTED_EXACTLY` is the counts block complete local input declares; one
 * display status of each kind, for the parts that render one; and a stored
 * view as a store lists it, spelled as the core fixtures spell theirs.
 */

import {
  type Completion,
  type Count,
  type CountCapabilities,
  createPage,
  type DisplayStatus,
  type SavedView,
  type SourcePage,
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

/** A page of rows, counted exactly and grouped by nothing. */
export const pageOf = <TRow extends object>(
  rows: readonly TRow[],
): SourcePage<TRow> =>
  createPage({ rows, matched: rows.length, total: rows.length });

/** A delivered page of rows, counted exactly and grouped by nothing. */
export const deliverRows = <TRow extends object>(
  rows: readonly TRow[],
): Completion<TRow> => ({
  status: "succeeded",
  page: pageOf(rows),
});

/** One display status of each kind, with a reason where the kind carries one. */
export const displayStatusOf = (
  status: DisplayStatus["status"],
): DisplayStatus =>
  status === "failed" || status === "refresh-failed" || status === "stale"
    ? { status, reason: "offline" }
    : { status };

/**
 * One stored view as a store lists it — first revision, unpinned, stamped
 * at a fixed instant — with any field overridden. The same builder, by the
 * same name, as the core package's testing fixtures.
 */
export const buildStoredView = (
  overrides: Partial<SavedView> = {},
): SavedView => ({
  id: "v1",
  name: "Failed",
  query: "as=table&status=failed",
  presentation: {},
  revision: 1,
  pinned: false,
  createdAt: "2026-09-11T00:00:00.000Z",
  updatedAt: "2026-09-11T00:00:00.000Z",
  ...overrides,
});

/**
 * The URL a server render and the hydration over it answer: running
 * machines ordered by cores, the second page of fifty.
 */
export const SERVER_RENDER_HREF =
  "/machines?status=running&sort=cores__desc&page=2&size=50";
