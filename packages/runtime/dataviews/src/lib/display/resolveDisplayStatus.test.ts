/**
 * The table's statuses must stay distinct: a collection that failed to load
 * is not an empty one, a query that matched nothing is not a collection with
 * nothing in it, rows an earlier query produced are not an answer to the
 * current one, and rows whose refresh failed are usable rows under a real
 * failure. Each case is driven through a real coordinator, its requests
 * completed by hand with what a source would deliver.
 */
import { describe, expect, it } from "vitest";
import {
  failedWith,
  pageOf,
  readIssuedRequest,
  refusedWith,
} from "../../../testing/fixtures.js";
import {
  createQueryCoordinator,
  type DataViewsState,
  type QueryCoordinator,
  type ResultState,
  type ResultStatus,
} from "../coordinator/index.js";
import { DEFAULT_WINDOW, EMPTY_SLICE, type Slice } from "../query/index.js";
import type {
  Completion,
  GroupSummary,
  ResultProblem,
} from "../result/index.js";
import { DISPLAY_STATUS_PHASES } from "./constants.js";
import resolveDisplayStatus from "./resolveDisplayStatus.js";
import type { DisplayStatus } from "./types.js";

type Machine = { readonly id: string; readonly name: string };

const machine = (id: string, name: string): Machine => ({ id, name });

/** The rows a source delivers. */
const delivery = (rows: readonly Machine[]): Completion<Machine> => ({
  status: "succeeded",
  page: pageOf(rows),
});

/** A coordinator whose first request was settled with `rows`. */
const loaded = (rows: readonly Machine[]): QueryCoordinator<Machine> => {
  const coordinator = createQueryCoordinator<Machine>();
  coordinator.complete(coordinator.refresh(), delivery(rows));
  return coordinator;
};

/** Search for `text` on a loaded coordinator, and settle the request with `completion`. */
const searched = (
  coordinator: QueryCoordinator<Machine>,
  completion: Completion<Machine>,
): QueryCoordinator<Machine> => {
  const { requestId } = coordinator.dispatch({
    kind: "setSearch",
    search: "machine",
  });
  coordinator.complete(readIssuedRequest(requestId), completion);
  return coordinator;
};

describe("resolveDisplayStatus", () => {
  it("reports pending before any rows arrive, requested or not", () => {
    const coordinator = createQueryCoordinator<Machine>();
    expect(resolveDisplayStatus(coordinator.state)).toEqual({
      status: "pending",
    });
    coordinator.refresh();
    expect(resolveDisplayStatus(coordinator.state)).toEqual({
      status: "pending",
    });
  });

  it("reports the failure of a request that produced no rows", () => {
    const coordinator = createQueryCoordinator<Machine>();
    coordinator.complete(
      coordinator.refresh(),
      failedWith("the collection is unreachable"),
    );
    expect(resolveDisplayStatus(coordinator.state)).toEqual({
      status: "failed",
      reason: "the collection is unreachable",
    });
  });

  it("reads a refusal's reasons as one sentence", () => {
    const coordinator = createQueryCoordinator<Machine>();
    coordinator.complete(
      coordinator.refresh(),
      refusedWith("name cannot be ordered", "two orderings at once"),
    );
    expect(resolveDisplayStatus(coordinator.state)).toEqual({
      status: "failed",
      reason: "name cannot be ordered; two orderings at once",
    });
  });

  it("reports an unfiltered collection with nothing in it as no data", () => {
    expect(resolveDisplayStatus(loaded([]).state)).toEqual({
      status: "no-data",
    });
  });

  it("reports a filtered query that matched nothing as no results", () => {
    const coordinator = loaded([]);
    const { requestId } = coordinator.dispatch({
      kind: "setPredicate",
      predicate: { field: "status", operator: "eq", operands: ["failed"] },
    });
    coordinator.complete(readIssuedRequest(requestId), delivery([]));
    expect(resolveDisplayStatus(coordinator.state)).toEqual({
      status: "no-results",
    });
  });

  it("reports a search that matched nothing as no results", () => {
    expect(
      resolveDisplayStatus(searched(loaded([]), delivery([])).state),
    ).toEqual({ status: "no-results" });
  });

  it("claims nothing about a moved query from an earlier query's empty page", () => {
    // Nothing matched before the search; whether anything matches it is the
    // source's to say. The same when a filter that matched nothing is
    // cleared: the collection is not called empty before it answers.
    const coordinator = loaded([]);
    coordinator.dispatch({ kind: "setSearch", search: "machine" });
    expect(resolveDisplayStatus(coordinator.state)).toEqual({
      status: "pending",
    });
    const filtered = searched(loaded([]), delivery([]));
    filtered.dispatch({ kind: "setSearch", search: "" });
    expect(resolveDisplayStatus(filtered.state)).toEqual({
      status: "pending",
    });
    // A refresh of the same query keeps its answer: the empty page is still
    // this query's while it is asked again.
    const refreshed = loaded([]);
    refreshed.refresh();
    expect(resolveDisplayStatus(refreshed.state)).toEqual({
      status: "no-data",
    });
  });

  it("reads an empty search as no search when deciding no data", () => {
    // A seeded or adopted slice may carry the empty string where a command
    // would have written null; both mean the collection is unfiltered.
    const coordinator = createQueryCoordinator<Machine>({
      slice: { ...EMPTY_SLICE, search: "" },
    });
    coordinator.complete(coordinator.refresh(), delivery([]));
    expect(resolveDisplayStatus(coordinator.state)).toEqual({
      status: "no-data",
    });
  });

  it("prefers the failure over emptiness when an empty result then failed", () => {
    const coordinator = loaded([]);
    coordinator.complete(coordinator.refresh(), failedWith("offline"));
    expect(resolveDisplayStatus(coordinator.state)).toEqual({
      status: "failed",
      reason: "offline",
    });
  });

  it("reports rows an earlier query produced as stale, with the reason", () => {
    const coordinator = searched(
      loaded([machine("m-1", "alpha")]),
      failedWith("search is unavailable"),
    );
    expect(coordinator.state.result.status).toBe("stale");
    expect(resolveDisplayStatus(coordinator.state)).toEqual({
      status: "stale",
      reason: "search is unavailable",
    });
  });

  it("reports a failed query with no earlier rows to keep as a failure", () => {
    const coordinator = searched(
      loaded([]),
      failedWith("search is unavailable"),
    );
    expect(coordinator.state.result.status).toBe("stale");
    expect(resolveDisplayStatus(coordinator.state)).toEqual({
      status: "failed",
      reason: "search is unavailable",
    });
  });

  it("reports rows kept through a failed refresh, with the reason", () => {
    const coordinator = loaded([machine("m-1", "alpha")]);
    coordinator.complete(coordinator.refresh(), failedWith("offline"));
    expect(coordinator.state.result.status).toBe("refresh-failed");
    expect(resolveDisplayStatus(coordinator.state)).toEqual({
      status: "refresh-failed",
      reason: "offline",
    });
  });

  it("reports nothing at all while rows are displayed", () => {
    expect(resolveDisplayStatus(loaded([machine("m-1", "alpha")]).state)).toBe(
      null,
    );
    const coordinator = loaded([machine("m-1", "alpha")]);
    coordinator.refresh();
    expect(resolveDisplayStatus(coordinator.state)).toBe(null);
  });

  it("reports pending for no rows at all, whatever the state claims", () => {
    // The coordinator sets provenance only on a success, so rows are never
    // null over a matching query; should a state say otherwise, no rows is
    // still nothing to show.
    const state: DataViewsState<Machine> = {
      ...createQueryCoordinator<Machine>().state,
      resultMatchesQuery: true,
    };
    expect(resolveDisplayStatus(state)).toEqual({ status: "pending" });
  });

  it("produces no regrouping status from any published state", () => {
    // Every combination a state can hold, hand-built because the absence
    // must cover the whole input space and not only the paths a source
    // takes: no result status, rows, problem or query yields the kind the
    // grouping work reserves.
    const statuses = Object.keys({
      idle: true,
      pending: true,
      refreshing: true,
      ready: true,
      "refresh-failed": true,
      stale: true,
      failed: true,
    } satisfies Record<ResultStatus, true>) as ResultStatus[];
    const problems: readonly (ResultProblem | null)[] = [
      null,
      {
        status: "failed",
        failure: { reason: "x", cause: null, transient: null },
      },
      refusedWith("x"),
    ];
    const rowSets: readonly (readonly Machine[] | null)[] = [
      null,
      [],
      [machine("m-1", "alpha")],
    ];
    const groupSets: readonly (readonly GroupSummary[] | null)[] = [
      null,
      [{ path: ["running"], count: { kind: "exact", value: 1 } }],
    ];
    const slices: readonly Slice[] = [
      EMPTY_SLICE,
      { ...EMPTY_SLICE, search: "alpha" },
      { ...EMPTY_SLICE, group: [{ field: "status" }] },
    ];
    const seen = new Set<DisplayStatus["status"] | null>();
    for (const status of statuses) {
      for (const problem of problems) {
        for (const rows of rowSets) {
          for (const groups of groupSets) {
            for (const slice of slices) {
              for (const resultMatchesQuery of [false, true]) {
                const result: ResultState<Machine> = {
                  status,
                  rows,
                  groups,
                  counts: null,
                  more: null,
                  cursors: null,
                  provenance: null,
                  problem,
                };
                const state: DataViewsState<Machine> = {
                  generation: 1,
                  slice,
                  window: DEFAULT_WINDOW,
                  result,
                  resultMatchesQuery,
                  pendingRequestId: null,
                };
                seen.add(resolveDisplayStatus(state)?.status ?? null);
              }
            }
          }
        }
      }
    }
    expect(seen.has("regrouping")).toBe(false);
    // Every other kind is reached, so the absence is not an artefact of
    // the matrix missing a path.
    expect([...seen].sort()).toEqual(
      [
        null,
        ...Object.keys(DISPLAY_STATUS_PHASES).filter(
          (kind) => kind !== "regrouping",
        ),
      ].sort(),
    );
  });
});
