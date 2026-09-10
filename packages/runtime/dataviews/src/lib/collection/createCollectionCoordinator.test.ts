import { describe, expect, it } from "vitest";
import type {
  Predicate,
  ResultWindow,
  Slice,
  SortTerm,
} from "../query/types.js";
import type { CollectionCoordinator } from "./createCollectionCoordinator.js";
import createCollectionCoordinator from "./createCollectionCoordinator.js";

const slice = (overrides: Partial<Slice> = {}): Slice => ({
  filter: [],
  search: null,
  sort: [],
  group: null,
  ...overrides,
});

const window = (page = 1, size = 50): ResultWindow => ({ page, size });

const statusPredicate = (...operands: string[]): Slice["filter"][number] => ({
  field: "status",
  operator: "eq",
  operands,
});

/** Dispatch a query change and return its request id, failing loudly. */
const dispatchRequest = (
  coordinator: CollectionCoordinator,
  command: Parameters<CollectionCoordinator["dispatch"]>[0],
): string => {
  const result = coordinator.dispatch(command);
  if (result.status !== "accepted" || result.requestId === null) {
    throw new Error("expected an accepted command with a request id");
  }
  return result.requestId;
};

describe("createCollectionCoordinator", () => {
  it("seeds idle with the configured slice and window", () => {
    const coordinator = createCollectionCoordinator({
      slice: slice({
        filter: [statusPredicate("failed")],
      }),
      window: window(2, 25),
    });
    const state = coordinator.state;
    expect(state.result.status).toBe("idle");
    expect(state.window).toEqual({ page: 2, size: 25 });
    expect(state.slice.filter).toHaveLength(1);
    expect(state.resultsMatchCurrentQuery).toBe(false);
  });

  it("issues a request on a query change, resets the window and retains rows", () => {
    const coordinator = createCollectionCoordinator({
      window: window(4),
    });
    const first = dispatchRequest(coordinator, {
      kind: "replacePredicate",
      predicate: statusPredicate("failed"),
    });
    expect(coordinator.state.window).toEqual({ page: 1, size: 50 });
    coordinator.complete(first, {
      status: "success",
      rows: [{ id: "machine-1" }],
      count: 1,
    });
    expect(coordinator.state.result.status).toBe("ready");
    expect(coordinator.state.resultsMatchCurrentQuery).toBe(true);

    const second = dispatchRequest(coordinator, {
      kind: "replacePredicate",
      predicate: statusPredicate("cancelled"),
    });
    expect(second).not.toBe(first);
    // Different query pending: retained rows and count keep their old
    // provenance.
    expect(coordinator.state.result.status).toBe("pending");
    expect(coordinator.state.result.rows).toEqual([{ id: "machine-1" }]);
    expect(coordinator.state.result.count).toBe(1);
    expect(coordinator.state.result.provenance?.requestId).toBe(first);
    expect(coordinator.state.resultsMatchCurrentQuery).toBe(false);
  });

  it("marks retained rows stale after a window-only change", () => {
    const coordinator = createCollectionCoordinator();
    const request = dispatchRequest(coordinator, {
      kind: "replacePredicate",
      predicate: statusPredicate("failed"),
    });
    coordinator.complete(request, {
      status: "success",
      rows: [{ id: "machine-1" }],
      count: 200,
    });
    expect(coordinator.state.resultsMatchCurrentQuery).toBe(true);

    dispatchRequest(coordinator, { kind: "navigateWindow", page: 2 });
    const result = coordinator.state.result;
    expect(result.status).toBe("pending");
    expect(result.rows).toEqual([{ id: "machine-1" }]);
    expect(coordinator.state.resultsMatchCurrentQuery).toBe(false);
    expect(coordinator.state.window).toEqual({ page: 2, size: 50 });
  });

  it("ignores completions for superseded requests", () => {
    const coordinator = createCollectionCoordinator();
    const first = dispatchRequest(coordinator, {
      kind: "replaceSearch",
      search: "yak",
    });
    const second = dispatchRequest(coordinator, {
      kind: "replaceSearch",
      search: "zebu",
    });
    // The slower first response arrives after the second request replaced it.
    expect(
      coordinator.complete(first, {
        status: "success",
        rows: [{ id: "stale" }],
        count: 99,
      }),
    ).toBe(false);
    expect(coordinator.state.result.rows).toBeNull();
    expect(coordinator.state.result.lastError).toBeNull();

    expect(
      coordinator.complete(second, {
        status: "success",
        rows: [{ id: "fresh" }],
        count: 1,
      }),
    ).toBe(true);
    expect(coordinator.state.result.rows).toEqual([{ id: "fresh" }]);
  });

  it("ignores stale failure completions", () => {
    const coordinator = createCollectionCoordinator();
    const first = dispatchRequest(coordinator, {
      kind: "replaceSearch",
      search: "yak",
    });
    const second = dispatchRequest(coordinator, {
      kind: "replaceSearch",
      search: "zebu",
    });
    expect(
      coordinator.complete(first, { status: "failure", reason: "gateway" }),
    ).toBe(false);
    expect(coordinator.state.result.lastError).toBeNull();
    expect(
      coordinator.complete(second, {
        status: "success",
        rows: [{ id: "fresh" }],
        count: 1,
      }),
    ).toBe(true);
  });

  it("publishes rows, provenance and count together", () => {
    const coordinator = createCollectionCoordinator();
    const request = dispatchRequest(coordinator, {
      kind: "replaceSearch",
      search: "yak",
    });
    const rows = [{ id: "machine-1" }, { id: "machine-2" }];
    coordinator.complete(request, {
      status: "success",
      rows,
      count: 2,
    });
    const result = coordinator.state.result;
    expect(result.status).toBe("ready");
    expect(result.rows).toHaveLength(2);
    expect(result.count).toBe(2);
    expect(result.provenance?.requestId).toBe(request);
    expect(coordinator.state.resultsMatchCurrentQuery).toBe(true);
    // The published rows are a defensive copy of the caller's array.
    rows.push({ id: "machine-3" });
    expect(coordinator.state.result.rows).toHaveLength(2);
  });

  it("publishes a request completion at most once", () => {
    const coordinator = createCollectionCoordinator();
    const request = dispatchRequest(coordinator, {
      kind: "replaceSearch",
      search: "yak",
    });
    expect(
      coordinator.complete(request, {
        status: "success",
        rows: [{ id: "machine-1" }],
        count: 1,
      }),
    ).toBe(true);
    // A duplicated delivery of the same completion must not overwrite.
    expect(
      coordinator.complete(request, {
        status: "failure",
        reason: "duplicate delivery",
      }),
    ).toBe(false);
    expect(coordinator.state.result.rows).toEqual([{ id: "machine-1" }]);
    expect(coordinator.state.result.lastError).toBeNull();
  });

  it("retains rows with the error recorded when a refresh fails", () => {
    const coordinator = createCollectionCoordinator();
    const request = dispatchRequest(coordinator, {
      kind: "replaceSearch",
      search: "yak",
    });
    coordinator.complete(request, {
      status: "success",
      rows: [{ id: "machine-1" }],
      count: 1,
    });

    const refreshId = coordinator.refresh();
    if (refreshId === null) {
      throw new Error("expected a refresh request");
    }
    expect(coordinator.state.result.status).toBe("refreshing");
    expect(coordinator.state.result.rows).toEqual([{ id: "machine-1" }]);
    expect(coordinator.state.resultsMatchCurrentQuery).toBe(true);

    coordinator.complete(refreshId, {
      status: "failure",
      reason: "gateway down",
    });
    const result = coordinator.state.result;
    expect(result.status).toBe("ready");
    expect(result.rows).toEqual([{ id: "machine-1" }]);
    expect(result.lastError).toBe("gateway down");
    expect(result.provenance?.requestId).toBe(request);
    // The retained rows still match the unchanged query.
    expect(coordinator.state.resultsMatchCurrentQuery).toBe(true);
  });

  it("publishes refreshed rows on a successful refresh", () => {
    const coordinator = createCollectionCoordinator();
    const request = dispatchRequest(coordinator, {
      kind: "replaceSearch",
      search: "yak",
    });
    coordinator.complete(request, {
      status: "success",
      rows: [{ id: "machine-1" }],
      count: 1,
    });
    const refreshId = coordinator.refresh();
    if (refreshId === null) {
      throw new Error("expected a refresh request");
    }
    coordinator.complete(refreshId, {
      status: "success",
      rows: [{ id: "machine-1" }, { id: "machine-2" }],
      count: 2,
    });
    const result = coordinator.state.result;
    expect(result.status).toBe("ready");
    expect(result.rows).toHaveLength(2);
    expect(result.provenance?.requestId).toBe(refreshId);
    expect(coordinator.state.resultsMatchCurrentQuery).toBe(true);
  });

  it("records error without rows when an initial request fails", () => {
    const coordinator = createCollectionCoordinator();
    const request = dispatchRequest(coordinator, {
      kind: "replaceSearch",
      search: "yak",
    });
    coordinator.complete(request, { status: "failure", reason: "offline" });
    expect(coordinator.state.result.status).toBe("error");
    expect(coordinator.state.result.rows).toBeNull();
    expect(coordinator.state.result.lastError).toBe("offline");
  });

  it("keeps retained rows unmatched when a different query fails", () => {
    const coordinator = createCollectionCoordinator();
    const request = dispatchRequest(coordinator, {
      kind: "replaceSearch",
      search: "yak",
    });
    coordinator.complete(request, {
      status: "success",
      rows: [{ id: "machine-1" }],
      count: 1,
    });
    const failedRequest = dispatchRequest(coordinator, {
      kind: "replaceSearch",
      search: "zebu",
    });
    coordinator.complete(failedRequest, {
      status: "failure",
      reason: "offline",
    });
    const result = coordinator.state.result;
    // The retained rows belong to the old query; the failure is recorded and
    // the rows are never described as results of the current query.
    expect(result.status).toBe("ready");
    expect(result.rows).toEqual([{ id: "machine-1" }]);
    expect(result.lastError).toBe("offline");
    expect(coordinator.state.resultsMatchCurrentQuery).toBe(false);
  });

  it("issues no request for a semantically unchanged edit", () => {
    const coordinator = createCollectionCoordinator({
      slice: slice({ search: "yak" }),
      window: window(3, 25),
    });
    const result = coordinator.dispatch({
      kind: "replaceSearch",
      search: "yak",
    });
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.requestId).toBeNull();
    expect(coordinator.state.result.status).toBe("idle");
    expect(coordinator.state.window).toEqual({ page: 3, size: 25 });
  });

  it("issues no request when navigating to the current window", () => {
    const coordinator = createCollectionCoordinator({
      window: window(2, 25),
    });
    const result = coordinator.dispatch({
      kind: "navigateWindow",
      page: 2,
      size: 25,
    });
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.requestId).toBeNull();
  });

  it("adopts external query and window together, superseding pending requests", () => {
    const coordinator = createCollectionCoordinator();
    const stale = dispatchRequest(coordinator, {
      kind: "replaceSearch",
      search: "yak",
    });
    const adopted = coordinator.adopt(
      slice({ search: "zebu", sort: [{ field: "name", direction: "asc" }] }),
      window(2, 25),
    );
    if (adopted === null) {
      throw new Error("expected an adopted request");
    }
    expect(coordinator.state.slice.search).toBe("zebu");
    expect(coordinator.state.window).toEqual({ page: 2, size: 25 });
    expect(coordinator.state.result.status).toBe("pending");
    // The superseded request's completion never publishes.
    expect(
      coordinator.complete(stale, {
        status: "success",
        rows: [{ id: "stale" }],
        count: 1,
      }),
    ).toBe(false);
    expect(
      coordinator.complete(adopted, {
        status: "success",
        rows: [{ id: "adopted" }],
        count: 1,
      }),
    ).toBe(true);
  });

  it("adopts an identical state without issuing a request", () => {
    const seed = slice({ search: "yak" });
    const coordinator = createCollectionCoordinator({
      slice: seed,
      window: window(2, 25),
    });
    expect(coordinator.adopt(seed, window(2, 25))).toBeNull();
    expect(coordinator.state.result.status).toBe("idle");
  });

  it("adopts a canonically equal spelling without issuing a request", () => {
    const coordinator = createCollectionCoordinator({
      slice: slice({ filter: [statusPredicate("failed", "cancelled")] }),
    });
    const respeled = slice({
      filter: [statusPredicate("cancelled", "failed")],
    });
    expect(coordinator.adopt(respeled, window())).toBeNull();
    expect(coordinator.state.result.status).toBe("idle");
  });

  it("distinguishes non-finite from null operands in request identity", () => {
    const coordinator = createCollectionCoordinator();
    const withNaN = slice({
      filter: [{ field: "cpu", operator: "gte", operands: [Number.NaN] }],
    });
    const withNull = slice({
      filter: [{ field: "cpu", operator: "gte", operands: [null] }],
    });
    const nanRequest = coordinator.adopt(withNaN, window());
    expect(nanRequest).not.toBeNull();
    expect(coordinator.adopt(withNull, window())).not.toBeNull();
  });

  it("distinguishes NaN from Infinity and from look-alike strings", () => {
    const withNaN = slice({
      filter: [{ field: "cpu", operator: "gte", operands: [Number.NaN] }],
    });
    const withInfinity = slice({
      filter: [
        { field: "cpu", operator: "gte", operands: [Number.POSITIVE_INFINITY] },
      ],
    });
    const withString = slice({
      filter: [{ field: "cpu", operator: "gte", operands: ["NaN"] }],
    });
    const first = createCollectionCoordinator();
    expect(first.adopt(withNaN, window())).not.toBeNull();
    expect(first.adopt(withInfinity, window())).not.toBeNull();

    const second = createCollectionCoordinator();
    expect(second.adopt(withNaN, window())).not.toBeNull();
    expect(second.adopt(withString, window())).not.toBeNull();
  });

  it("treats a key-order respelling as a canonical no-op", () => {
    const coordinator = createCollectionCoordinator({
      slice: slice({
        filter: [
          {
            field: "status",
            operator: "eq",
            operands: ["failed", "cancelled"],
          },
        ],
        sort: [{ field: "name", direction: "asc" }],
      }),
    });
    const respeled = slice({
      filter: [
        {
          operands: ["cancelled", "failed"],
          operator: "eq",
          field: "status",
        },
      ],
      sort: [{ direction: "asc", field: "name" }],
    });
    expect(coordinator.adopt(respeled, window())).toBeNull();
    expect(coordinator.state.result.status).toBe("idle");
  });

  it("keeps adopted state immune to nested caller mutations", () => {
    const coordinator = createCollectionCoordinator();
    const predicate = {
      field: "status",
      operator: "eq" as const,
      operands: ["failed" as const],
    };
    const adopted = slice({ filter: [predicate] });
    const callerWindow = window(2, 25);
    const request = coordinator.adopt(adopted, callerWindow);
    if (request === null) {
      throw new Error("expected an adopted request");
    }
    coordinator.complete(request, {
      status: "success",
      rows: [{ id: "machine-1" }],
      count: 1,
    });
    (predicate.operands as string[]).push("cancelled");
    (callerWindow as { page: number }).page = 9;
    expect(coordinator.state.slice.filter[0]?.operands).toEqual(["failed"]);
    expect(coordinator.state.window).toEqual({ page: 2, size: 25 });
  });

  it("keeps the configured window immune to caller mutations", () => {
    const callerWindow = window(3, 25);
    const coordinator = createCollectionCoordinator({
      window: callerWindow,
    });
    (callerWindow as { page: number }).page = 7;
    expect(coordinator.state.window).toEqual({ page: 3, size: 25 });
  });

  it("freezes adopted nested state against mutation", () => {
    const coordinator = createCollectionCoordinator();
    const request = coordinator.adopt(
      slice({ filter: [statusPredicate("failed")] }),
      window(),
    );
    if (request === null) {
      throw new Error("expected an adopted request");
    }
    const filter = coordinator.state.slice.filter as Predicate[];
    expect(() => filter.push(statusPredicate("cancelled"))).toThrow();
  });

  it("clears the last error when a new request begins", () => {
    const coordinator = createCollectionCoordinator();
    const first = dispatchRequest(coordinator, {
      kind: "replaceSearch",
      search: "yak",
    });
    coordinator.complete(first, { status: "failure", reason: "offline" });
    expect(coordinator.state.result.lastError).toBe("offline");
    dispatchRequest(coordinator, { kind: "replaceSearch", search: "zebu" });
    expect(coordinator.state.result.lastError).toBeNull();
    expect(coordinator.state.result.status).toBe("pending");
  });

  it("issues distinct request ids across coordinator instances", () => {
    const a = createCollectionCoordinator();
    const b = createCollectionCoordinator();
    const requestA = dispatchRequest(a, { kind: "navigateWindow", page: 2 });
    const requestB = dispatchRequest(b, { kind: "navigateWindow", page: 2 });
    expect(requestA).not.toBe(requestB);
  });

  it("ignores completions when idle without a request", () => {
    const coordinator = createCollectionCoordinator();
    expect(
      coordinator.complete("does-not-exist", {
        status: "success",
        rows: [{ id: "bogus" }],
        count: 1,
      }),
    ).toBe(false);
    expect(
      coordinator.complete(null as unknown as string, {
        status: "success",
        rows: [{ id: "bogus" }],
        count: 1,
      }),
    ).toBe(false);
    expect(coordinator.state.result.rows).toBeNull();
  });

  it("rejects invalid seed and adopted windows at intake", () => {
    expect(() =>
      createCollectionCoordinator({ window: { page: 0, size: 25 } }),
    ).toThrow("page must be a positive integer");
    expect(() =>
      createCollectionCoordinator({ window: { page: 2, size: 0 } }),
    ).toThrow("size must be a positive integer");
    const coordinator = createCollectionCoordinator();
    expect(() => coordinator.adopt(slice(), { page: -1, size: 25 })).toThrow(
      "page must be a positive integer",
    );
    expect(() => coordinator.adopt(slice(), { page: 1, size: 1.5 })).toThrow(
      "size must be a positive integer",
    );
  });

  it("keeps the configured seed immune to caller mutations", () => {
    const seed = slice({
      filter: [statusPredicate("failed")],
      sort: [{ field: "name", direction: "asc" }],
    });
    const coordinator = createCollectionCoordinator({ slice: seed });
    const mutableFilter = seed.filter as Predicate[];
    const mutableSort = seed.sort as SortTerm[];
    mutableFilter.push(statusPredicate("cancelled"));
    mutableSort.push({ field: "zone", direction: "desc" });
    coordinator.dispatch({ kind: "navigateWindow", page: 3 });
    coordinator.rotateScope();
    expect(coordinator.state.slice.filter).toEqual([statusPredicate("failed")]);
    expect(coordinator.state.slice.sort).toEqual([
      { field: "name", direction: "asc" },
    ]);
  });

  it("rejects commands after dispose and ignores completions", () => {
    const coordinator = createCollectionCoordinator();
    const request = dispatchRequest(coordinator, {
      kind: "navigateWindow",
      page: 2,
    });
    coordinator.dispose();
    expect(
      coordinator.complete(request, {
        status: "success",
        rows: [],
        count: 0,
      }),
    ).toBe(false);
    const after = coordinator.dispatch({ kind: "navigateWindow", page: 3 });
    expect(after.status).toBe("rejected");
    expect(coordinator.state.disposed).toBe(true);
  });

  it("returns no refresh or adopt after dispose", () => {
    const coordinator = createCollectionCoordinator();
    coordinator.dispose();
    expect(coordinator.refresh()).toBeNull();
    expect(coordinator.adopt(slice(), window())).toBeNull();
    expect(coordinator.state.result.status).toBe("idle");
  });

  it("leaves a disposed coordinator's snapshot untouched on rotateScope", () => {
    const coordinator = createCollectionCoordinator();
    coordinator.dispose();
    const before = coordinator.state;
    coordinator.rotateScope();
    expect(coordinator.state).toBe(before);
    expect(coordinator.state.disposed).toBe(true);
  });

  it("passes command rejections through without a request", () => {
    const coordinator = createCollectionCoordinator();
    const result = coordinator.dispatch({
      kind: "navigateWindow",
      page: 0,
    });
    if (result.status !== "rejected") {
      throw new Error("expected rejection");
    }
    expect(result.requestId).toBeNull();
    expect(result.reason).toBe("page must be a positive integer");
    expect(coordinator.state.result.status).toBe("idle");
  });

  it("never publishes old-scope completions into a rotated scope", () => {
    const seed = slice({ search: "yak" });
    const coordinator = createCollectionCoordinator({ slice: seed });
    const scopeBefore = coordinator.state.scope;
    const staleRequest = dispatchRequest(coordinator, {
      kind: "replaceSearch",
      search: "zebu",
    });
    coordinator.rotateScope();
    expect(coordinator.state.scope).not.toBe(scopeBefore);
    // A slow response from the previous scope arrives after rotation.
    expect(
      coordinator.complete(staleRequest, {
        status: "success",
        rows: [{ id: "old-scope" }],
        count: 1,
      }),
    ).toBe(false);
    expect(coordinator.state.result.rows).toBeNull();
    expect(coordinator.state.slice.search).toBe("yak");

    const fresh = dispatchRequest(coordinator, {
      kind: "navigateWindow",
      page: 2,
    });
    expect(
      coordinator.complete(fresh, {
        status: "success",
        rows: [{ id: "new-scope" }],
        count: 1,
      }),
    ).toBe(true);
    expect(coordinator.state.result.rows).toEqual([{ id: "new-scope" }]);
  });

  it("resets to the configured seed on scope rotation", () => {
    const seed = slice({ search: "yak" });
    const coordinator = createCollectionCoordinator({
      slice: seed,
      window: window(1, 25),
    });
    coordinator.dispatch({ kind: "replaceSearch", search: "zebu" });
    coordinator.dispatch({ kind: "navigateWindow", page: 4 });
    coordinator.rotateScope();
    const state = coordinator.state;
    expect(state.slice.search).toBe("yak");
    expect(state.window).toEqual({ page: 1, size: 25 });
    expect(state.result.status).toBe("idle");
    expect(state.resultsMatchCurrentQuery).toBe(false);
  });

  it("serves a referentially stable snapshot between mutations", () => {
    const coordinator = createCollectionCoordinator();
    const first = coordinator.state;
    expect(coordinator.state).toBe(first);
    // No-change and rejected dispatches must not churn the snapshot either.
    coordinator.dispatch({ kind: "navigateWindow", page: 1 });
    expect(coordinator.state).toBe(first);
    coordinator.dispatch({ kind: "navigateWindow", page: 0 });
    expect(coordinator.state).toBe(first);
    coordinator.dispatch({ kind: "navigateWindow", page: 2 });
    expect(coordinator.state).not.toBe(first);
  });

  it("refreshes from an idle state without prior rows", () => {
    const coordinator = createCollectionCoordinator();
    const refreshId = coordinator.refresh();
    if (refreshId === null) {
      throw new Error("expected a refresh request");
    }
    expect(coordinator.state.result.status).toBe("refreshing");
    expect(coordinator.state.result.rows).toBeNull();
    coordinator.complete(refreshId, {
      status: "success",
      rows: [{ id: "machine-1" }],
      count: 1,
    });
    expect(coordinator.state.result.status).toBe("ready");
  });
});
