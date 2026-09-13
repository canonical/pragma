import { describe, expect, it } from "vitest";
import {
  DEFAULT_WINDOW,
  type GroupTerm,
  type Predicate,
  type ResultWindow,
  type Slice,
  type SortTerm,
} from "../query/index.js";
import type {
  Completion,
  Count,
  GroupSummary,
  SourceCounts,
  SourcePage,
} from "../result/index.js";
import type { RowRecord } from "../rows/index.js";
import createQueryCoordinator from "./createQueryCoordinator.js";
import type { QueryCoordinator } from "./types.js";

const slice = (overrides: Partial<Slice> = {}): Slice => ({
  filter: [],
  search: null,
  sort: [],
  group: [],
  ...overrides,
});

const window = (overrides: Partial<ResultWindow> = {}): ResultWindow => ({
  ...DEFAULT_WINDOW,
  ...overrides,
});

const statusPredicate = (...operands: string[]): Predicate => ({
  field: "status",
  operator: "eq",
  operands,
});

const UNKNOWN: Count = { kind: "unknown" };

/** What an ungrouped source counts: the matched rows are the visible ones. */
const counts = (matched: number): SourceCounts => ({
  pageable: { kind: "exact", value: matched },
  matched: { kind: "exact", value: matched },
  total: UNKNOWN,
});

const succeeded = (
  rows: readonly RowRecord[],
  overrides: Partial<SourcePage> = {},
): Completion => ({
  status: "succeeded",
  page: {
    rows,
    groups: null,
    counts: counts(rows.length),
    more: null,
    cursors: null,
    ...overrides,
  },
});

const failed = (reason: string, cause: unknown = null): Completion => ({
  status: "failed",
  failure: { reason, cause, transient: null },
});

const refused = (reason: string): Completion => ({
  status: "refused",
  refusals: [
    {
      part: "filter",
      code: "undeclared-field",
      field: "zone",
      operator: "eq",
      reason,
    },
  ],
});

/** Dispatch a query change and return its request id, failing loudly. */
const dispatchRequest = (
  coordinator: QueryCoordinator,
  command: Parameters<QueryCoordinator["dispatch"]>[0],
): string => {
  const result = coordinator.dispatch(command);
  if (result.status !== "accepted" || result.requestId === null) {
    throw new Error("expected an accepted command with a request id");
  }
  return result.requestId;
};

/** Refresh and return the request id. */
const refreshRequest = (coordinator: QueryCoordinator): string =>
  coordinator.refresh();

describe("createQueryCoordinator", () => {
  it("seeds idle with the configured slice and window", () => {
    const coordinator = createQueryCoordinator({
      slice: slice({ filter: [statusPredicate("failed")] }),
      window: window({ page: 2, size: 25 }),
    });
    const state = coordinator.state;
    expect(state.result.status).toBe("idle");
    expect(state.window).toEqual(window({ page: 2, size: 25 }));
    expect(state.slice.filter).toHaveLength(1);
    expect(state.resultMatchesQuery).toBe(false);
  });

  it("issues a request on a query change, resets the window and retains rows", () => {
    const coordinator = createQueryCoordinator({
      window: window({ page: 4 }),
    });
    const first = dispatchRequest(coordinator, {
      kind: "setPredicate",
      predicate: statusPredicate("failed"),
    });
    expect(coordinator.state.window).toEqual(window());
    coordinator.complete(first, succeeded([{ id: "machine-1" }]));
    expect(coordinator.state.result.status).toBe("ready");
    expect(coordinator.state.resultMatchesQuery).toBe(true);

    const second = dispatchRequest(coordinator, {
      kind: "setPredicate",
      predicate: statusPredicate("cancelled"),
    });
    expect(second).not.toBe(first);
    // Different query pending: retained rows and counts keep their old
    // provenance.
    expect(coordinator.state.result.status).toBe("pending");
    expect(coordinator.state.result.rows).toEqual([{ id: "machine-1" }]);
    expect(coordinator.state.result.counts).toEqual(counts(1));
    expect(coordinator.state.result.provenance?.requestId).toBe(first);
    expect(coordinator.state.resultMatchesQuery).toBe(false);
  });

  it("keeps retained rows unmatched after a window-only change", () => {
    const coordinator = createQueryCoordinator();
    const request = dispatchRequest(coordinator, {
      kind: "setPredicate",
      predicate: statusPredicate("failed"),
    });
    coordinator.complete(request, succeeded([{ id: "machine-1" }]));
    expect(coordinator.state.resultMatchesQuery).toBe(true);

    dispatchRequest(coordinator, { kind: "navigateWindow", page: 2 });
    const result = coordinator.state.result;
    expect(result.status).toBe("pending");
    expect(result.rows).toEqual([{ id: "machine-1" }]);
    expect(coordinator.state.resultMatchesQuery).toBe(false);
    expect(coordinator.state.window).toEqual(window({ page: 2 }));
  });

  it("ignores completions for superseded requests", () => {
    const coordinator = createQueryCoordinator();
    const first = dispatchRequest(coordinator, {
      kind: "setSearch",
      search: "yak",
    });
    const second = dispatchRequest(coordinator, {
      kind: "setSearch",
      search: "zebu",
    });
    // The slower first response arrives after the second request replaced it.
    expect(coordinator.complete(first, succeeded([{ id: "stale" }]))).toBe(
      false,
    );
    expect(coordinator.state.result.rows).toBeNull();
    expect(coordinator.state.result.problem).toBeNull();

    expect(coordinator.complete(second, succeeded([{ id: "fresh" }]))).toBe(
      true,
    );
    expect(coordinator.state.result.rows).toEqual([{ id: "fresh" }]);
  });

  it("ignores failure completions for superseded requests", () => {
    const coordinator = createQueryCoordinator();
    const first = dispatchRequest(coordinator, {
      kind: "setSearch",
      search: "yak",
    });
    const second = dispatchRequest(coordinator, {
      kind: "setSearch",
      search: "zebu",
    });
    expect(coordinator.complete(first, failed("gateway"))).toBe(false);
    expect(coordinator.state.result.problem).toBeNull();
    expect(coordinator.complete(second, succeeded([{ id: "fresh" }]))).toBe(
      true,
    );
  });

  it("publishes rows, groups, counts, more, cursors and provenance together", () => {
    const coordinator = createQueryCoordinator();
    const request = dispatchRequest(coordinator, {
      kind: "setSearch",
      search: "yak",
    });
    const rows = [{ id: "machine-1" }, { id: "machine-2" }];
    coordinator.complete(
      request,
      succeeded(rows, {
        counts: counts(9),
        more: true,
        cursors: { next: "c:machine-2", previous: null },
      }),
    );
    const state = coordinator.state;
    expect(state.result).toEqual({
      status: "ready",
      rows: [{ id: "machine-1" }, { id: "machine-2" }],
      groups: null,
      counts: counts(9),
      more: true,
      cursors: { next: "c:machine-2", previous: null },
      provenance: {
        requestId: request,
        slice: state.slice,
        window: state.window,
      },
      problem: null,
    });
    expect(state.resultMatchesQuery).toBe(true);
    // The published rows are a defensive copy of the caller's array.
    rows.push({ id: "machine-3" });
    expect(coordinator.state.result.rows).toHaveLength(2);
  });

  it("copies the envelope, so a reused one cannot change what was published", () => {
    const coordinator = createQueryCoordinator();
    const request = dispatchRequest(coordinator, {
      kind: "setSearch",
      search: "yak",
    });
    // A source is free to hand the same envelope back on every delivery; a
    // published snapshot must not move when it fills the next one in.
    const groups: GroupSummary[] = [
      { path: ["failed"], count: { kind: "exact", value: 2 } },
    ];
    const page: SourcePage = {
      rows: [{ id: "machine-1" }],
      groups,
      counts: counts(1),
      more: null,
      cursors: { next: "c:machine-1", previous: null },
    };
    coordinator.complete(request, { status: "succeeded", page });
    const published = coordinator.state.result;
    expect(published.groups).toEqual(groups);
    expect(published.groups).not.toBe(groups);
    expect(published.counts).not.toBe(page.counts);
    expect(published.cursors).toEqual({ next: "c:machine-1", previous: null });
    expect(published.cursors).not.toBe(page.cursors);
    groups.push({ path: ["ready"], count: { kind: "exact", value: 1 } });
    expect(coordinator.state.result.groups).toHaveLength(1);
  });

  it("stamps the slice and window the rows answer, never what the source says", () => {
    const coordinator = createQueryCoordinator({
      window: window({ size: 25 }),
    });
    const request = dispatchRequest(coordinator, {
      kind: "setSearch",
      search: "yak",
    });
    coordinator.complete(request, succeeded([{ id: "machine-1" }]));
    const { result, slice: applied, window: paged } = coordinator.state;
    expect(result.provenance?.slice).toBe(applied);
    expect(result.provenance?.window).toBe(paged);
    expect(result.provenance?.slice.search).toBe("yak");
    expect(result.provenance?.window).toEqual(window({ size: 25 }));
  });

  it("publishes a request completion at most once", () => {
    const coordinator = createQueryCoordinator();
    const request = dispatchRequest(coordinator, {
      kind: "setSearch",
      search: "yak",
    });
    expect(
      coordinator.complete(request, succeeded([{ id: "machine-1" }])),
    ).toBe(true);
    // A duplicated delivery of the same completion must not overwrite.
    expect(coordinator.complete(request, failed("duplicate delivery"))).toBe(
      false,
    );
    expect(coordinator.state.result.rows).toEqual([{ id: "machine-1" }]);
    expect(coordinator.state.result.problem).toBeNull();
  });

  it("reports a failed refresh over rows that still answer the query", () => {
    const coordinator = createQueryCoordinator();
    const request = dispatchRequest(coordinator, {
      kind: "setSearch",
      search: "yak",
    });
    coordinator.complete(request, succeeded([{ id: "machine-1" }]));

    const refreshId = refreshRequest(coordinator);
    expect(coordinator.state.result.status).toBe("refreshing");
    expect(coordinator.state.result.rows).toEqual([{ id: "machine-1" }]);
    expect(coordinator.state.resultMatchesQuery).toBe(true);

    const cause = new Error("gateway down");
    coordinator.complete(refreshId, failed("gateway down", cause));
    const result = coordinator.state.result;
    // The rows are usable and the failure is real, so both are reported.
    expect(result.status).toBe("refresh-failed");
    expect(result.rows).toEqual([{ id: "machine-1" }]);
    expect(result.problem).toEqual({
      status: "failed",
      failure: { reason: "gateway down", cause, transient: null },
    });
    expect(result.provenance?.requestId).toBe(request);
    expect(coordinator.state.resultMatchesQuery).toBe(true);
  });

  it("reports a refusal over rows that still answer the query", () => {
    const coordinator = createQueryCoordinator();
    const request = dispatchRequest(coordinator, {
      kind: "setSearch",
      search: "yak",
    });
    coordinator.complete(request, succeeded([{ id: "machine-1" }]));
    const refusal = refused('field "zone" cannot be filtered');
    coordinator.complete(refreshRequest(coordinator), refusal);
    const result = coordinator.state.result;
    expect(result.status).toBe("refresh-failed");
    expect(result.rows).toEqual([{ id: "machine-1" }]);
    expect(result.problem).toEqual({
      status: "refused",
      refusals: [
        {
          part: "filter",
          code: "undeclared-field",
          field: "zone",
          operator: "eq",
          reason: 'field "zone" cannot be filtered',
        },
      ],
    });
  });

  it("publishes refreshed rows on a successful refresh", () => {
    const coordinator = createQueryCoordinator();
    const request = dispatchRequest(coordinator, {
      kind: "setSearch",
      search: "yak",
    });
    coordinator.complete(request, succeeded([{ id: "machine-1" }]));
    const refreshId = refreshRequest(coordinator);
    coordinator.complete(
      refreshId,
      succeeded([{ id: "machine-1" }, { id: "machine-2" }]),
    );
    const result = coordinator.state.result;
    expect(result.status).toBe("ready");
    expect(result.rows).toHaveLength(2);
    expect(result.provenance?.requestId).toBe(refreshId);
    expect(coordinator.state.resultMatchesQuery).toBe(true);
  });

  it("fails without rows when an initial request fails", () => {
    const coordinator = createQueryCoordinator();
    const request = dispatchRequest(coordinator, {
      kind: "setSearch",
      search: "yak",
    });
    coordinator.complete(request, failed("offline"));
    const result = coordinator.state.result;
    expect(result.status).toBe("failed");
    expect(result.rows).toBeNull();
    expect(result.problem).toEqual({
      status: "failed",
      failure: { reason: "offline", cause: null, transient: null },
    });
  });

  it("fails without rows when an initial request is refused", () => {
    const coordinator = createQueryCoordinator();
    const request = dispatchRequest(coordinator, {
      kind: "setSearch",
      search: "yak",
    });
    coordinator.complete(request, refused("this source cannot search"));
    expect(coordinator.state.result.status).toBe("failed");
    expect(coordinator.state.result.problem?.status).toBe("refused");
  });

  it("keeps retained rows unmatched when a different query fails", () => {
    const coordinator = createQueryCoordinator();
    const request = dispatchRequest(coordinator, {
      kind: "setSearch",
      search: "yak",
    });
    coordinator.complete(request, succeeded([{ id: "machine-1" }]));
    const failedRequest = dispatchRequest(coordinator, {
      kind: "setSearch",
      search: "zebu",
    });
    coordinator.complete(failedRequest, failed("offline"));
    const result = coordinator.state.result;
    // The retained rows belong to the old query; the failure is recorded and
    // the rows are never described as results of the current query.
    expect(result.status).toBe("stale");
    expect(result.rows).toEqual([{ id: "machine-1" }]);
    expect(result.problem?.status).toBe("failed");
    expect(coordinator.state.resultMatchesQuery).toBe(false);
  });

  it("marks an earlier query's empty result stale when the current one fails", () => {
    const coordinator = createQueryCoordinator();
    coordinator.complete(
      dispatchRequest(coordinator, { kind: "setSearch", search: "yak" }),
      succeeded([]),
    );
    coordinator.complete(
      dispatchRequest(coordinator, { kind: "setSearch", search: "zebu" }),
      failed("offline"),
    );
    expect(coordinator.state.result.status).toBe("stale");
    expect(coordinator.state.result.rows).toEqual([]);
  });

  it("stays stale until the current query succeeds, then reports ready", () => {
    const coordinator = createQueryCoordinator();
    coordinator.complete(
      dispatchRequest(coordinator, { kind: "setSearch", search: "yak" }),
      succeeded([{ id: "machine-1" }]),
    );
    coordinator.complete(
      dispatchRequest(coordinator, { kind: "setSearch", search: "zebu" }),
      failed("offline"),
    );
    coordinator.complete(refreshRequest(coordinator), failed("still offline"));
    expect(coordinator.state.result.status).toBe("stale");
    expect(coordinator.state.result.problem).toEqual({
      status: "failed",
      failure: { reason: "still offline", cause: null, transient: null },
    });

    coordinator.complete(
      dispatchRequest(coordinator, { kind: "setSearch", search: "gnu" }),
      succeeded([{ id: "machine-2" }]),
    );
    expect(coordinator.state.result.status).toBe("ready");
    expect(coordinator.state.result.problem).toBeNull();
    expect(coordinator.state.resultMatchesQuery).toBe(true);
  });

  it("issues no request for a semantically unchanged edit", () => {
    const coordinator = createQueryCoordinator({
      slice: slice({ search: "yak" }),
      window: window({ page: 3, size: 25 }),
    });
    const result = coordinator.dispatch({ kind: "setSearch", search: "yak" });
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.requestId).toBeNull();
    expect(coordinator.state.result.status).toBe("idle");
    expect(coordinator.state.window).toEqual(window({ page: 3, size: 25 }));
  });

  it("issues no request when navigating to the current window", () => {
    const coordinator = createQueryCoordinator({
      window: window({ page: 2, size: 25 }),
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

  it("adopts a query as one object, superseding pending requests", () => {
    const coordinator = createQueryCoordinator();
    const stale = dispatchRequest(coordinator, {
      kind: "setSearch",
      search: "yak",
    });
    const adopted = coordinator.adopt({
      slice: slice({
        search: "zebu",
        sort: [{ field: "name", direction: "asc" }],
      }),
      window: window({ page: 2, size: 25 }),
    });
    if (adopted === null) {
      throw new Error("expected an adopted request");
    }
    expect(coordinator.state.slice.search).toBe("zebu");
    expect(coordinator.state.window).toEqual(window({ page: 2, size: 25 }));
    expect(coordinator.state.result.status).toBe("pending");
    // The superseded request's completion never publishes.
    expect(coordinator.complete(stale, succeeded([{ id: "stale" }]))).toBe(
      false,
    );
    expect(coordinator.complete(adopted, succeeded([{ id: "adopted" }]))).toBe(
      true,
    );
  });

  it("adopts an identical query without issuing a request", () => {
    const seed = slice({ search: "yak" });
    const coordinator = createQueryCoordinator({
      slice: seed,
      window: window({ page: 2, size: 25 }),
    });
    expect(
      coordinator.adopt({ slice: seed, window: window({ page: 2, size: 25 }) }),
    ).toBeNull();
    expect(coordinator.state.result.status).toBe("idle");
  });

  it("adopts a canonically equal spelling without issuing a request", () => {
    const coordinator = createQueryCoordinator({
      slice: slice({ filter: [statusPredicate("failed", "cancelled")] }),
    });
    const respeled = slice({
      filter: [statusPredicate("cancelled", "failed")],
    });
    expect(coordinator.adopt({ slice: respeled, window: window() })).toBeNull();
    expect(coordinator.state.result.status).toBe("idle");
  });

  it("takes the cursor and the collapsed groups into request identity", () => {
    const coordinator = createQueryCoordinator({
      window: window({ page: 2, cursor: "c:m2" }),
    });
    // The same page reached by the same token is the same request…
    expect(
      coordinator.adopt({
        slice: slice(),
        window: window({ page: 2, cursor: "c:m2" }),
      }),
    ).toBeNull();
    // …while another token for that page, or a collapsed group, is not.
    expect(
      coordinator.adopt({
        slice: slice(),
        window: window({ page: 2, cursor: "c:m4" }),
      }),
    ).not.toBeNull();
    expect(
      coordinator.adopt({
        slice: slice(),
        window: window({
          page: 2,
          cursor: "c:m4",
          collapsed: [["failed"]],
        }),
      }),
    ).not.toBeNull();
  });

  it("distinguishes non-finite from null operands in request identity", () => {
    const coordinator = createQueryCoordinator();
    const withNaN = slice({
      filter: [{ field: "cpu", operator: "gte", operands: [Number.NaN] }],
    });
    const withNull = slice({
      filter: [{ field: "cpu", operator: "gte", operands: [null] }],
    });
    expect(
      coordinator.adopt({ slice: withNaN, window: window() }),
    ).not.toBeNull();
    expect(
      coordinator.adopt({ slice: withNull, window: window() }),
    ).not.toBeNull();
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
    const first = createQueryCoordinator();
    expect(first.adopt({ slice: withNaN, window: window() })).not.toBeNull();
    expect(
      first.adopt({ slice: withInfinity, window: window() }),
    ).not.toBeNull();

    const second = createQueryCoordinator();
    expect(second.adopt({ slice: withNaN, window: window() })).not.toBeNull();
    expect(
      second.adopt({ slice: withString, window: window() }),
    ).not.toBeNull();
  });

  it("treats a key-order respelling as a canonical no-op", () => {
    const coordinator = createQueryCoordinator({
      slice: slice({
        filter: [statusPredicate("failed", "cancelled")],
        sort: [{ field: "name", direction: "asc" }],
        group: [{ field: "zone" }],
      }),
    });
    const respeled = slice({
      filter: [
        { operands: ["cancelled", "failed"], operator: "eq", field: "status" },
      ],
      sort: [{ direction: "asc", field: "name" }],
      group: [{ field: "zone" }],
    });
    expect(coordinator.adopt({ slice: respeled, window: window() })).toBeNull();
    expect(coordinator.state.result.status).toBe("idle");
  });

  it("keeps adopted state immune to nested caller mutations", () => {
    const coordinator = createQueryCoordinator();
    const predicate = {
      field: "status",
      operator: "eq" as const,
      operands: ["failed"],
    };
    const path = ["failed"];
    const callerWindow = window({ page: 2, size: 25, collapsed: [path] });
    const request = coordinator.adopt({
      slice: slice({ filter: [predicate] }),
      window: callerWindow,
    });
    if (request === null) {
      throw new Error("expected an adopted request");
    }
    coordinator.complete(request, succeeded([{ id: "machine-1" }]));
    predicate.operands.push("cancelled");
    path.push("eu-west");
    (callerWindow as { page: number }).page = 9;
    expect(coordinator.state.slice.filter[0]?.operands).toEqual(["failed"]);
    expect(coordinator.state.window).toEqual(
      window({ page: 2, size: 25, collapsed: [["failed"]] }),
    );
  });

  it("keeps a dispatched command's own objects out of published state", () => {
    const coordinator = createQueryCoordinator();
    const terms: SortTerm[] = [{ field: "name", direction: "asc" }];
    const path = ["failed"];
    coordinator.dispatch({ kind: "setSort", sort: terms });
    coordinator.dispatch({ kind: "setCollapsed", collapsed: [path] });
    (terms[0] as { field: string }).field = "cpu";
    path.push("eu-west");
    expect(coordinator.state.slice.sort).toEqual([
      { field: "name", direction: "asc" },
    ]);
    expect(coordinator.state.window.collapsed).toEqual([["failed"]]);
  });

  it("keeps the slice's identity across a window-only move", () => {
    // A source may cache what it filtered and sorted against the slice it
    // was handed; a page turn must not look like a new query to it.
    const coordinator = createQueryCoordinator();
    coordinator.dispatch({ kind: "setSearch", search: "yak" });
    const applied = coordinator.state.slice;
    coordinator.dispatch({ kind: "navigateWindow", page: 3 });
    expect(coordinator.state.slice).toBe(applied);
    coordinator.dispatch({ kind: "setCollapsed", collapsed: [["failed"]] });
    expect(coordinator.state.slice).toBe(applied);
    coordinator.dispatch({ kind: "setSearch", search: "ox" });
    expect(coordinator.state.slice).not.toBe(applied);
  });

  it("takes a page of one, the smallest window there is", () => {
    const coordinator = createQueryCoordinator({
      window: window({ size: 1 }),
    });
    expect(coordinator.state.window.size).toBe(1);
    const request = dispatchRequest(coordinator, {
      kind: "navigateWindow",
      page: 2,
    });
    expect(coordinator.state.pendingRequestId).toBe(request);
    expect(coordinator.state.window).toEqual(window({ page: 2, size: 1 }));
  });

  it("keeps the configured window immune to caller mutations", () => {
    const callerWindow = window({ page: 3, size: 25 });
    const coordinator = createQueryCoordinator({ window: callerWindow });
    (callerWindow as { page: number }).page = 7;
    expect(coordinator.state.window).toEqual(window({ page: 3, size: 25 }));
  });

  it("freezes adopted nested state against mutation", () => {
    const coordinator = createQueryCoordinator();
    const request = coordinator.adopt({
      slice: slice({ filter: [statusPredicate("failed")] }),
      window: window(),
    });
    if (request === null) {
      throw new Error("expected an adopted request");
    }
    const filter = coordinator.state.slice.filter as Predicate[];
    expect(() => filter.push(statusPredicate("cancelled"))).toThrow();
  });

  it("clears the problem when a new request begins", () => {
    const coordinator = createQueryCoordinator();
    const first = dispatchRequest(coordinator, {
      kind: "setSearch",
      search: "yak",
    });
    coordinator.complete(first, failed("offline"));
    expect(coordinator.state.result.problem?.status).toBe("failed");
    dispatchRequest(coordinator, { kind: "setSearch", search: "zebu" });
    expect(coordinator.state.result.problem).toBeNull();
    expect(coordinator.state.result.status).toBe("pending");
  });

  it("issues distinct request ids across coordinator instances", () => {
    const a = createQueryCoordinator();
    const b = createQueryCoordinator();
    const requestA = dispatchRequest(a, { kind: "navigateWindow", page: 2 });
    const requestB = dispatchRequest(b, { kind: "navigateWindow", page: 2 });
    expect(requestA).not.toBe(requestB);
  });

  it("ignores completions when idle without a request", () => {
    const coordinator = createQueryCoordinator();
    expect(
      coordinator.complete("does-not-exist", succeeded([{ id: "bogus" }])),
    ).toBe(false);
    expect(
      coordinator.complete(
        null as unknown as string,
        succeeded([{ id: "bogus" }]),
      ),
    ).toBe(false);
    expect(coordinator.state.result.rows).toBeNull();
  });

  it("rejects invalid seed and adopted windows at intake", () => {
    expect(() =>
      createQueryCoordinator({ window: window({ page: 0 }) }),
    ).toThrow("page must be a positive integer");
    expect(() =>
      createQueryCoordinator({ window: window({ size: 0 }) }),
    ).toThrow("size must be a positive integer");
    expect(() =>
      createQueryCoordinator({ window: window({ cursor: "" }) }),
    ).toThrow("cursor must not be empty; use null to clear it");
    const coordinator = createQueryCoordinator();
    expect(() =>
      coordinator.adopt({ slice: slice(), window: window({ page: -1 }) }),
    ).toThrow("page must be a positive integer");
    expect(() =>
      coordinator.adopt({ slice: slice(), window: window({ size: 1.5 }) }),
    ).toThrow("size must be a positive integer");
    expect(() =>
      coordinator.adopt({ slice: slice(), window: window({ cursor: "" }) }),
    ).toThrow("cursor must not be empty; use null to clear it");
  });

  it("keeps the configured seed immune to caller mutations", () => {
    const seed = slice({
      filter: [statusPredicate("failed")],
      sort: [{ field: "name", direction: "asc" }],
      group: [{ field: "zone" }],
    });
    const coordinator = createQueryCoordinator({ slice: seed });
    (seed.filter as Predicate[]).push(statusPredicate("cancelled"));
    (seed.sort as SortTerm[]).push({ field: "zone", direction: "desc" });
    (seed.group as GroupTerm[]).push({ field: "owner" });
    coordinator.dispatch({ kind: "navigateWindow", page: 3 });
    coordinator.reset();
    expect(coordinator.state.slice.filter).toEqual([statusPredicate("failed")]);
    expect(coordinator.state.slice.sort).toEqual([
      { field: "name", direction: "asc" },
    ]);
    expect(coordinator.state.slice.group).toEqual([{ field: "zone" }]);
  });

  it("passes command rejections through without a request", () => {
    const coordinator = createQueryCoordinator();
    const result = coordinator.dispatch({ kind: "navigateWindow", page: 0 });
    if (result.status !== "rejected") {
      throw new Error("expected rejection");
    }
    expect(result.requestId).toBeNull();
    expect(result.reason).toBe("page must be a positive integer");
    expect(coordinator.state.result.status).toBe("idle");
  });

  it("never publishes an old generation's completions into the next", () => {
    const coordinator = createQueryCoordinator({
      slice: slice({ search: "yak" }),
    });
    const generationBefore = coordinator.state.generation;
    const staleRequest = dispatchRequest(coordinator, {
      kind: "setSearch",
      search: "zebu",
    });
    coordinator.reset();
    expect(coordinator.state.generation).toBe(generationBefore + 1);
    // A slow response from the previous generation arrives after the reset.
    expect(
      coordinator.complete(staleRequest, succeeded([{ id: "old-generation" }])),
    ).toBe(false);
    expect(coordinator.state.result.rows).toBeNull();
    expect(coordinator.state.slice.search).toBe("yak");

    const fresh = dispatchRequest(coordinator, {
      kind: "navigateWindow",
      page: 2,
    });
    expect(
      coordinator.complete(fresh, succeeded([{ id: "new-generation" }])),
    ).toBe(true);
    expect(coordinator.state.result.rows).toEqual([{ id: "new-generation" }]);
  });

  it("returns to the configured seed on reset", () => {
    const coordinator = createQueryCoordinator({
      slice: slice({ search: "yak" }),
      window: window({ size: 25 }),
    });
    coordinator.dispatch({ kind: "setSearch", search: "zebu" });
    coordinator.dispatch({ kind: "navigateWindow", page: 4 });
    coordinator.reset();
    const state = coordinator.state;
    expect(state.slice.search).toBe("yak");
    expect(state.window).toEqual(window({ size: 25 }));
    expect(state.result.status).toBe("idle");
    expect(state.resultMatchesQuery).toBe(false);
  });

  it("serves a referentially stable snapshot between mutations", () => {
    const coordinator = createQueryCoordinator();
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

  it("refreshes from an idle state as a pending first request", () => {
    const coordinator = createQueryCoordinator();
    const refreshId = refreshRequest(coordinator);
    // Nothing is on display to refresh: the first page is pending.
    expect(coordinator.state.result.status).toBe("pending");
    expect(coordinator.state.result.rows).toBeNull();
    coordinator.complete(refreshId, succeeded([{ id: "machine-1" }]));
    expect(coordinator.state.result.status).toBe("ready");
  });

  it("names the one request awaiting completion, and only while it waits", () => {
    const coordinator = createQueryCoordinator();
    expect(coordinator.state.pendingRequestId).toBeNull();

    const requestId = refreshRequest(coordinator);
    expect(coordinator.state.pendingRequestId).toBe(requestId);

    coordinator.complete(requestId, succeeded([]));
    expect(coordinator.state.pendingRequestId).toBeNull();
  });

  it("names the superseding request, never the one it replaced", () => {
    const coordinator = createQueryCoordinator();
    const first = coordinator.refresh();
    const second = coordinator.dispatch({
      kind: "navigateWindow",
      page: 2,
    }).requestId;
    expect(second).not.toBe(first);
    expect(coordinator.state.pendingRequestId).toBe(second);
  });

  it("names the adopted request and forgets it on reset", () => {
    const coordinator = createQueryCoordinator();
    const adopted = coordinator.adopt({
      slice: slice({ search: "web" }),
      window: window(),
    });
    expect(coordinator.state.pendingRequestId).toBe(adopted);
    coordinator.reset();
    expect(coordinator.state.pendingRequestId).toBeNull();
  });

  it("keeps naming no pending request through a failed completion", () => {
    const coordinator = createQueryCoordinator();
    const requestId = refreshRequest(coordinator);
    coordinator.complete(requestId, failed("503"));
    expect(coordinator.state.pendingRequestId).toBeNull();
    expect(coordinator.state.result.problem).toEqual({
      status: "failed",
      failure: { reason: "503", cause: null, transient: null },
    });
  });
});
