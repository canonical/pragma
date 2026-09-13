import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import {
  byId,
  declare,
  declareSort,
  pageOf,
} from "../../../testing/fixtures.js";
import { createCollection } from "../collection/index.js";
import type { DataViewsState } from "../coordinator/index.js";
import { DEFAULT_WINDOW, type Query, type Slice } from "../query/index.js";
import type {
  Count,
  SourceDelivery,
  SourcePage,
  SourceRefusal,
} from "../result/index.js";
import type { RowRecord } from "../rows/index.js";
import type { SchemaFieldDefinition } from "../schema/index.js";
import {
  createArraySource,
  type Source,
  type SourceActionRunner,
  type SourceCapabilities,
} from "../source/index.js";
import createDataViewsProvider from "./createDataViewsProvider.js";
import readProviderHost from "./readProviderHost.js";
import runSource from "./runSource.js";
import type { ProviderHost } from "./types.js";

const collection = createCollection({
  identify: byId,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "ready"] },
    { field: "cpu", kind: "number" },
  ],
});

/** Everything the fixture queries need, and three exact counts. */
const permissive: SourceCapabilities = declare({
  filter: { status: ["eq"], cpu: ["gte", "lte"] },
  search: { fields: ["name"] },
  sort: declareSort(["cpu"], 2),
  counts: { pageable: "exact", matched: "exact", total: "exact" },
});

const exact = (value: number): Count => ({ kind: "exact", value });

const succeeded = (rows: readonly RowRecord[]): SourceDelivery => ({
  status: "succeeded",
  page: pageOf(rows),
});

const failed = (reason: string): SourceDelivery => ({
  status: "failed",
  failure: { reason, cause: new Error(reason), transient: null },
});

/** A source whose deliveries the test drives by hand, permissive by default. */
const manual = (capabilities: SourceCapabilities = permissive) =>
  createManualSource({ capabilities });

const query = (slice: Partial<Slice> = {}): Query => ({
  slice: { filter: [], search: null, sort: [], group: [], ...slice },
  window: DEFAULT_WINDOW,
});

const rows = [
  { id: "a", name: "Alpha", cpu: 4 },
  { id: "b", name: "beta", cpu: 12 },
  { id: "c", name: "Gamma", cpu: 8 },
];

const localCollection = createCollection({
  identify: byId,
  fields: [
    { field: "id", kind: "text" },
    { field: "name", kind: "text" },
    { field: "cpu", kind: "number" },
    { field: "status", kind: "choices", options: ["failed", "ready"] },
  ],
});

const local = () =>
  createArraySource<RowRecord>({
    rows,
    collection: localCollection,
    searchFields: ["name"],
  });

const idsOf = (state: DataViewsState) =>
  (state.result.rows ?? []).map((row) => String(row["id"]));

/** The problem the host last published, or null rather than a skipped test. */
const problemOf = (state: DataViewsState) => state.result.problem;

/**
 * A provider over the source, its host, and a run built directly over
 * that host: the run under test, isolated from the provider's own run,
 * which stays inert while nothing observes the provider.
 */
const build = (source: Source) => {
  const provider = createDataViewsProvider({ collection, source });
  const host = readProviderHost(provider);
  const run = runSource({ host, source });
  return { provider, host, run };
};

/** `build`, observed: the release comes back with the rest. */
const running = (source: Source) => {
  const built = build(source);
  return { ...built, release: built.run.observe() };
};

/**
 * The host behind a state channel that counts its subscribers and can be
 * muted, so a request is issued without the run seeing it — the one way a
 * delivery reaches a host whose pending request the run has not seen.
 */
const counting = <
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object,
>(
  host: ProviderHost<TFields, TRow>,
) => {
  let subscribers = 0;
  let muted = false;
  const wrapped: ProviderHost<TFields, TRow> = {
    ...host,
    state: {
      get: host.state.get,
      subscribe(listener) {
        subscribers += 1;
        const off = host.state.subscribe(() => {
          if (!muted) {
            listener();
          }
        });
        return () => {
          subscribers -= 1;
          off();
        };
      },
    },
  };
  const quietly = <T>(act: () => T): T => {
    muted = true;
    try {
      return act();
    } finally {
      muted = false;
    }
  };
  return {
    host: wrapped,
    subscribers: () => subscribers,
    issueSilently: () => quietly(() => host.refresh()),
  };
};

describe("runSource ports", () => {
  it.each([
    [
      "actions it has no runAction to run",
      {
        capabilities: declare({
          actions: { stop: { targets: "explicit", limit: null } },
        }),
      },
      "this source declares actions it has no runAction to run",
    ],
    [
      "a runAction that declares no action",
      { runAction: (() => Promise.resolve([])) as SourceActionRunner },
      "this source has a runAction but declares no action",
    ],
    [
      "cursor pages nothing says are reachable",
      {
        capabilities: declare({
          pagination: { kind: "cursor", backward: false, durable: false },
        }),
      },
      "a cursor source must declare which pages it cannot reach through refusals",
    ],
  ])(
    "refuses a source declaring %s when the provider is built",
    (_part, difference, message) => {
      expect(() =>
        createDataViewsProvider({
          collection,
          source: { ...manual().source, ...difference },
        }),
      ).toThrow(message);
    },
  );

  it("accepts a cursor source that says which pages it cannot reach", () => {
    const source = createManualSource({
      capabilities: declare({
        pagination: { kind: "cursor", backward: true, durable: true },
      }),
      refusals: () => [],
    });
    expect(() =>
      createDataViewsProvider({ collection, source: source.source }),
    ).not.toThrow();
  });
});

describe("runSource refusals", () => {
  it("refuses a request before it costs the source a round trip", () => {
    const source = manual(declare({ ...permissive, sort: declareSort([], 0) }));
    const { host, release } = running(source.source);
    host.adopt(query({ sort: [{ field: "cpu", direction: "asc" }] }));
    expect(source.calls).toHaveLength(0);
    expect(host.state.get().result.status).toBe("failed");
    expect(problemOf(host.state.get())).toEqual({
      status: "refused",
      refusals: [
        {
          part: "sort",
          code: "too-many-terms",
          field: null,
          operator: null,
          reason: "this source cannot sort",
        },
      ],
    });
    release();
  });

  it("reaches the host with every refusal at once", () => {
    const source = manual(
      declare({ ...permissive, search: null, sort: declareSort([], 0) }),
    );
    const { host, release } = running(source.source);
    host.adopt(
      query({ search: "web", sort: [{ field: "cpu", direction: "asc" }] }),
    );
    expect(source.calls).toHaveLength(0);
    const problem = problemOf(host.state.get());
    expect(problem?.status === "refused" && problem.refusals).toMatchObject([
      { part: "search", code: "undeclared-field" },
      { part: "sort", code: "too-many-terms" },
    ]);
    release();
  });

  it("treats a field declared with no operator list as unfilterable", () => {
    // Legal per the declaration type, and it must not read as "any operator".
    const source = manual(
      declare({ ...permissive, filter: { status: ["eq"], cpu: [] } }),
    );
    const { host, release } = running(source.source);
    host.adopt(
      query({ filter: [{ field: "cpu", operator: "gte", operands: [1] }] }),
    );
    expect(source.calls).toHaveLength(0);
    expect(problemOf(host.state.get())).toMatchObject({
      status: "refused",
      refusals: [{ part: "filter", field: "cpu", operator: "gte" }],
    });
    release();
  });

  it("refuses a grouped query rather than answering it ungrouped", () => {
    const source = manual();
    const { host, release } = running(source.source);
    host.refresh();
    source.callAt(0).deliver(succeeded([]));
    host.adopt(query({ group: [{ field: "status" }] }));
    // Refused before the source is asked: the page stands.
    expect(source.calls).toHaveLength(1);
    expect(problemOf(host.state.get())).toMatchObject({
      status: "refused",
      refusals: [{ part: "group", reason: "this source cannot group" }],
    });
    release();
  });

  it("refuses a collapsed group on a source that cannot collapse", () => {
    const source = manual();
    const { host, release } = running(source.source);
    host.refresh();
    source.callAt(0).deliver(succeeded([]));
    host.adopt({
      ...query(),
      window: { ...DEFAULT_WINDOW, collapsed: [["failed"]] },
    });
    expect(source.calls).toHaveLength(1);
    expect(problemOf(host.state.get())).toMatchObject({
      status: "refused",
      refusals: [{ part: "window", code: "unsupported-collapse" }],
    });
    release();
  });

  it("refuses a cursor page on a source that pages by number", () => {
    const source = manual();
    const { host, release } = running(source.source);
    host.adopt({
      ...query(),
      window: { ...DEFAULT_WINDOW, page: 2, cursor: "c1" },
    });
    expect(source.calls).toHaveLength(0);
    expect(problemOf(host.state.get())).toMatchObject({
      status: "refused",
      refusals: [{ part: "window", code: "unreachable-page" }],
    });
    release();
  });

  it("refuses what the source alone knows it cannot reach", () => {
    const refusal: SourceRefusal = {
      part: "search",
      code: "unsupported-combination",
      field: null,
      operator: null,
      reason: "this endpoint cannot search a filtered set",
    };
    const source = createManualSource({
      capabilities: permissive,
      refusals: (request) => (request.slice.search === null ? [] : [refusal]),
    });
    const { host, release } = running(source.source);
    host.refresh();
    expect(source.calls).toHaveLength(1);
    host.adopt(query({ search: "web" }));
    expect(source.calls).toHaveLength(1);
    expect(problemOf(host.state.get())).toMatchObject({
      status: "refused",
      refusals: [refusal],
    });
    release();
  });
});

describe("runSource", () => {
  it("executes nothing until it observes its host", () => {
    const source = manual();
    const { host, run } = build(source.source);
    const requestId = host.refresh();
    expect(source.calls).toHaveLength(0);

    const release = run.observe();
    expect(source.calls).toHaveLength(1);
    expect(source.callAt(0).request.requestId).toBe(requestId);
    release();
  });

  it("refuses to observe one host twice", () => {
    const { run } = build(manual().source);
    const release = run.observe();
    expect(() => run.observe()).toThrow(
      "this source is already running against its host",
    );
    release();
  });

  it("observes again once the first observation is released", () => {
    const source = manual();
    const { host, run } = build(source.source);
    run.observe()();
    const release = run.observe();
    host.refresh();
    expect(source.calls).toHaveLength(1);
    release();
  });

  it("executes nothing when it observes a settled host", () => {
    const source = manual();
    const { host, run } = build(source.source);
    const requestId = host.refresh();
    host.complete(requestId, succeeded(rows));
    const release = run.observe();
    expect(source.calls).toHaveLength(0);
    expect(host.state.get().result.provenance?.requestId).toBe(requestId);
    expect(host.state.get().resultMatchesQuery).toBe(true);
    release();
  });

  it("executes the request the provider's first observer issues", () => {
    const source = manual();
    const provider = createDataViewsProvider({
      collection,
      source: source.source,
    });
    expect(source.calls).toHaveLength(0);
    const release = provider.observe();
    expect(source.calls).toHaveLength(1);
    expect(source.callAt(0).request.requestId).toBe(
      provider.state.get().pendingRequestId,
    );
    release();
    expect(source.callAt(0).releases).toBe(1);
  });

  it("executes each newly issued request and publishes its completion", () => {
    const source = manual();
    const { host, release } = running(source.source);
    expect(source.calls).toHaveLength(0);

    const requestId = host.refresh();
    expect(source.callAt(0).request).toEqual({
      requestId,
      slice: host.state.get().slice,
      window: DEFAULT_WINDOW,
    });
    source.callAt(0).deliver(succeeded(rows));
    expect(host.state.get().result).toEqual({
      status: "ready",
      rows,
      groups: null,
      counts: pageOf(rows).counts,
      more: null,
      cursors: null,
      provenance: {
        requestId,
        slice: host.state.get().slice,
        window: DEFAULT_WINDOW,
      },
      problem: null,
    });
    expect(host.state.get().resultMatchesQuery).toBe(true);
    release();
  });

  it("carries the request's whole query and window to the source", () => {
    const source = manual();
    const { provider, host, release } = running(source.source);
    host.setPredicate({
      field: "status",
      operator: "eq",
      operands: ["failed"],
    });
    provider.setSearch("web");
    provider.navigateWindow({ page: 2, size: 10 });
    const last = source.latest().request;
    expect(last.slice).toEqual({
      filter: [{ field: "status", operator: "eq", operands: ["failed"] }],
      search: "web",
      sort: [],
      group: [],
    });
    expect(last.window).toEqual({
      page: 2,
      size: 10,
      cursor: null,
      collapsed: [],
    });
    release();
  });

  it("filters through the array source end to end", () => {
    const provider = createDataViewsProvider({ collection, source: local() });
    const host = readProviderHost(provider);
    const release = provider.observe();
    expect(idsOf(host.state.get())).toEqual(["a", "b", "c"]);
    host.setPredicate({ field: "cpu", operator: "gte", operands: [8] });
    expect(idsOf(host.state.get())).toEqual(["b", "c"]);
    expect(host.state.get().result.counts?.matched).toEqual(exact(2));
    expect(host.state.get().result.counts?.total).toEqual(exact(3));
    release();
  });

  it("releases the previous request when a new one supersedes it", () => {
    const source = manual();
    const { provider, host, release } = running(source.source);
    host.refresh();
    provider.setSearch("web");
    expect(source.calls).toHaveLength(2);
    expect(source.callAt(0).releases).toBe(1);
    expect(source.callAt(1).releases).toBe(0);
    release();
  });

  it("drops the completion of a superseded in-flight request", () => {
    const source = manual();
    const { provider, host, release } = running(source.source);
    host.refresh();
    provider.setSearch("web");
    const pending = host.state.get().pendingRequestId;

    source.callAt(0).deliver(succeeded(rows));
    expect(host.state.get().result.rows).toBeNull();
    expect(host.state.get().result.status).toBe("pending");
    expect(host.state.get().pendingRequestId).toBe(pending);

    source.callAt(1).deliver(succeeded(rows.slice(0, 1)));
    expect(idsOf(host.state.get())).toEqual(["a"]);
    release();
  });

  it("drops a delivery that arrives after release", () => {
    const source = manual();
    const { host, release } = running(source.source);
    const requestId = host.refresh();
    expect(source.calls).toHaveLength(1);

    release();
    expect(source.callAt(0).releases).toBe(1);
    source.callAt(0).deliver(succeeded(rows));
    expect(host.state.get().result.rows).toBeNull();
    expect(host.state.get().result.status).toBe("pending");
    expect(host.state.get().pendingRequestId).toBe(requestId);
  });

  it("detaches from the host once, however often the release is called", () => {
    const source = manual();
    const { host } = build(source.source);
    const counted = counting(host);
    const release = runSource({
      host: counted.host,
      source: source.source,
    }).observe();
    counted.host.refresh();
    expect(counted.subscribers()).toBe(1);

    release();
    release();
    expect(source.callAt(0).releases).toBe(1);
    expect(counted.subscribers()).toBe(0);
  });

  it("stops observing the host once released", () => {
    const source = manual();
    const { host, run } = build(source.source);
    run.observe()();
    host.refresh();
    expect(source.calls).toHaveLength(0);
  });

  it("publishes a failure with the retained rows and the reason", () => {
    const source = manual();
    const { provider, host, release } = running(source.source);
    host.refresh();
    source.callAt(0).deliver(succeeded(rows));
    provider.setSearch("web");
    source.callAt(1).deliver(failed("503 from ex:api"));
    expect(host.state.get().result).toMatchObject({
      status: "stale",
      rows,
      problem: { status: "failed", failure: { reason: "503 from ex:api" } },
    });
    expect(host.state.get().resultMatchesQuery).toBe(false);
    release();
  });

  it("reports a failed refresh over rows that still answer the query", () => {
    const source = manual();
    const { host, release } = running(source.source);
    host.refresh();
    source.callAt(0).deliver(succeeded(rows));
    host.refresh();
    source.callAt(1).deliver(failed("no route"));
    expect(host.state.get().result).toMatchObject({
      status: "refresh-failed",
      rows,
      problem: { status: "failed", failure: { reason: "no route" } },
    });
    release();
  });

  it("publishes a failure when the source cannot even start", () => {
    let starts = 0;
    const { host, release } = running({
      capabilities: permissive,
      execute() {
        starts += 1;
        throw new Error("no client configured");
      },
    });
    host.refresh();
    expect(host.state.get().result).toMatchObject({
      status: "failed",
      problem: {
        status: "failed",
        failure: { reason: "no client configured" },
      },
    });
    expect(host.state.get().pendingRequestId).toBeNull();

    // Nothing is left running, so the next request starts from scratch.
    host.refresh();
    expect(starts).toBe(2);
    release();
  });

  it("leaves a newer execution alone when an older start throws", () => {
    let calls = 0;
    let releases = 0;
    /** The live execution's own delivery, captured to prove it still works. */
    let live: ((delivery: SourceDelivery) => void) | null = null;
    const source: Source = {
      capabilities: permissive,
      execute(_request, deliver) {
        calls += 1;
        if (calls === 1) {
          // Settle this request and move the query on, so a second
          // execution is already running when this call fails.
          deliver(succeeded([]));
          provider.setSearch("moved");
          throw new Error("late failure");
        }
        live = deliver;
        return () => {
          releases += 1;
        };
      },
    };
    const { provider, host, release } = running(source);
    host.refresh();
    expect(calls).toBe(2);
    // The superseded request's failure must not publish over the request
    // that replaced it.
    expect(problemOf(host.state.get())).toBeNull();
    // And the newer execution is still the run's: it publishes, and the
    // release it handed over is still reachable. Dropping it here would
    // leave the collection permanently silent and the source subscribed.
    if (live === null) {
      throw new Error("expected the newer execution to have started");
    }
    (live as (delivery: SourceDelivery) => void)(succeeded(rows));
    expect(idsOf(host.state.get())).toEqual(["a", "b", "c"]);
    expect(host.state.get().result.status).toBe("ready");
    release();
    expect(releases).toBe(1);
  });

  it("executes an adopted query, as on back or forward navigation", () => {
    const source = manual();
    const { host, release } = running(source.source);
    const adopted: Slice = {
      filter: [],
      search: "web",
      sort: [{ field: "cpu", direction: "asc" }],
      group: [],
    };
    const window = { ...DEFAULT_WINDOW, page: 3, size: 25 };
    const requestId = host.adopt({ slice: adopted, window });
    expect(source.callAt(0).request).toEqual({
      requestId,
      slice: host.state.get().slice,
      window,
    });
    release();
  });

  // An adopted query carrying a sort its source never declared: it is
  // refused, and the rows shown are the last ones that worked. They must say
  // so rather than claim to be ready, until the query moves on.
  it("reports rows kept past a refused adopted query as stale until it moves on", () => {
    const fleet = Array.from({ length: 9 }, (_, index) => ({
      id: `m${index}`,
      status: index % 3 === 0 ? "failed" : "ready",
      cpu: (index % 4) + 1,
    }));
    // The source holds no cpu field, so it cannot order by one.
    const { host, release } = running(
      createArraySource<RowRecord>({
        rows: fleet,
        collection: createCollection({
          identify: byId,
          fields: [
            { field: "id", kind: "text" },
            { field: "status", kind: "choices", options: ["failed", "ready"] },
          ],
        }),
      }),
    );
    const observed = () => {
      const state = host.state.get();
      return {
        rows: state.result.rows?.length,
        status: state.result.status,
        matches: state.resultMatchesQuery,
        problem: state.result.problem?.status ?? null,
      };
    };
    const failing: Slice["filter"] = [
      { field: "status", operator: "eq", operands: ["failed"] },
    ];
    const byCpu: Slice["sort"] = [{ field: "cpu", direction: "asc" }];
    host.refresh();
    expect(observed()).toEqual({
      rows: 9,
      status: "ready",
      matches: true,
      problem: null,
    });
    host.adopt(query({ filter: failing }));
    expect(observed()).toEqual({
      rows: 3,
      status: "ready",
      matches: true,
      problem: null,
    });
    host.adopt(query({ filter: failing, sort: byCpu }));
    expect(observed()).toEqual({
      rows: 3,
      status: "stale",
      matches: false,
      problem: "refused",
    });
    host.adopt(
      query({
        filter: [{ field: "status", operator: "eq", operands: ["ready"] }],
        sort: byCpu,
      }),
    );
    expect(observed()).toEqual({
      rows: 3,
      status: "stale",
      matches: false,
      problem: "refused",
    });
    // The query stays as adopted: the refused term is shown, never dropped.
    expect(host.state.get().slice.sort).toEqual(byCpu);
    host.adopt(
      query({
        filter: [{ field: "status", operator: "eq", operands: ["ready"] }],
      }),
    );
    expect(observed()).toEqual({
      rows: 6,
      status: "ready",
      matches: true,
      problem: null,
    });
    release();
  });

  it("stops the live request when the generation changes", () => {
    const source = manual();
    const { provider, host, release } = running(source.source);
    host.refresh();
    provider.reset();
    expect(source.callAt(0).releases).toBe(1);
    expect(host.state.get().result.status).toBe("idle");

    // The earlier generation's execution can no longer publish into this one.
    source.callAt(0).deliver(succeeded(rows));
    expect(host.state.get().result.status).toBe("idle");

    const requestId = host.refresh();
    expect(source.calls).toHaveLength(2);
    expect(source.callAt(1).request.requestId).toBe(requestId);
    source.callAt(1).deliver(succeeded(rows.slice(0, 1)));
    expect(idsOf(host.state.get())).toEqual(["a"]);
    release();
  });

  it("keeps republishing external changes after a generation change", () => {
    const source = local();
    const provider = createDataViewsProvider({ collection, source });
    const host = readProviderHost(provider);
    const release = provider.observe();
    // An observed provider asks for the new generation's first page itself.
    provider.reset();
    expect(idsOf(host.state.get())).toEqual(["a", "b", "c"]);

    source.setRows([{ id: "z", name: "Zed", cpu: 1 }]);
    expect(idsOf(host.state.get())).toEqual(["z"]);
    release();
  });

  it("executes a request delivered synchronously by its own source", () => {
    const { host, run } = build(local());
    const requestId = host.refresh();
    const release = run.observe();
    expect(host.state.get().result).toMatchObject({
      status: "ready",
      provenance: { requestId },
    });
    release();
  });

  it("republishes an external change under a fresh request identity", () => {
    const source = local();
    const provider = createDataViewsProvider({ collection, source });
    const host = readProviderHost(provider);
    const release = provider.observe();
    const first = host.state.get().result.provenance?.requestId;
    expect(first).toBeDefined();
    expect(idsOf(host.state.get())).toEqual(["a", "b", "c"]);

    source.setRows([...rows, { id: "d", name: "delta", cpu: 1 }]);
    const state = host.state.get();
    expect(idsOf(state)).toEqual(["a", "b", "c", "d"]);
    expect(state.result.counts?.matched).toEqual(exact(4));
    expect(state.result.provenance).not.toBeNull();
    expect(state.result.provenance?.requestId).not.toBe(first);
    expect(state.resultMatchesQuery).toBe(true);
    expect(state.pendingRequestId).toBeNull();
    release();
  });

  it("republishes without re-executing a source that delivers on its own", () => {
    const source = manual();
    const { host, release } = running(source.source);
    const first = host.refresh();
    source.callAt(0).deliver(succeeded(rows));

    source.callAt(0).deliver(succeeded(rows.slice(0, 1)));
    expect(source.calls).toHaveLength(1);
    const state = host.state.get();
    expect(idsOf(state)).toEqual(["a"]);
    expect(state.result.counts?.matched).toEqual(exact(1));
    expect(state.result.provenance).not.toBeNull();
    expect(state.result.provenance?.requestId).not.toBe(first);
    expect(state.resultMatchesQuery).toBe(true);
    release();
  });

  it("converges on a request another listener issued while it republished", () => {
    const source = manual();
    const { provider, host, release } = running(source.source);
    host.refresh();
    source.callAt(0).deliver(succeeded(rows));

    let armed = true;
    host.state.subscribe(() => {
      if (armed && host.state.get().result.status === "refreshing") {
        armed = false;
        provider.setSearch("web");
      }
    });
    source.callAt(0).deliver(succeeded(rows.slice(0, 1)));

    const pending = host.state.get().pendingRequestId;
    expect(pending).not.toBeNull();
    expect(source.latest().request.requestId).toBe(pending);
    release();
  });

  it("releases a request superseded during its own synchronous delivery", () => {
    const calls: { requestId: string; releases: number }[] = [];
    const eager: Source = {
      capabilities: permissive,
      execute(request, deliver) {
        const call = { requestId: request.requestId, releases: 0 };
        calls.push(call);
        deliver(succeeded(rows));
        return () => {
          call.releases += 1;
        };
      },
    };
    const { provider, host, release } = running(eager);
    let armed = true;
    host.state.subscribe(() => {
      if (armed && host.state.get().result.status === "ready") {
        armed = false;
        provider.setSearch("web");
      }
    });

    host.refresh();
    expect(calls).toHaveLength(2);
    expect(calls[0]?.releases).toBe(1);
    expect(calls[1]?.releases).toBe(0);
    expect(host.state.get().result.provenance?.requestId).toBe(
      calls[1]?.requestId,
    );
    release();
  });

  it("drops an external change the run is released mid-republish", () => {
    const source = local();
    const { host, release } = running(source);
    host.refresh();
    host.state.subscribe(() => {
      if (host.state.get().result.status === "refreshing") {
        release();
      }
    });

    source.setRows([{ id: "z", name: "Zed", cpu: 1 }]);
    expect(idsOf(host.state.get())).toEqual(["a", "b", "c"]);
    expect(host.state.get().result.status).toBe("refreshing");
  });

  it("never republishes an external change into a request already in flight", () => {
    const source = manual();
    const { host } = build(source.source);
    const counted = counting(host);
    const release = runSource({
      host: counted.host,
      source: source.source,
    }).observe();
    counted.host.refresh();
    source.callAt(0).deliver(succeeded(rows));
    expect(counted.host.state.get().result.counts?.matched).toEqual(exact(3));

    counted.issueSilently();
    source.callAt(0).deliver(succeeded([]));
    expect(counted.host.state.get().result.counts?.matched).toEqual(exact(3));
    release();
  });
});

describe("runSource counts", () => {
  const publishing = (
    counts: SourceCapabilities["counts"],
    delivered: SourcePage["counts"],
  ) => {
    const source = manual(declare({ ...permissive, counts }));
    const { host, release } = running(source.source);
    host.refresh();
    source.callAt(0).deliver({
      status: "succeeded",
      page: { ...pageOf(rows), counts: delivered },
    });
    const published = host.state.get().result.counts;
    release();
    return published;
  };

  const claimed = {
    pageable: exact(1),
    matched: { kind: "at-least", value: 2 } as Count,
    total: { kind: "unknown" } as Count,
  };

  it("publishes unknown for a count the declaration does not carry", () => {
    expect(
      publishing(
        { pageable: "unknown", matched: "unknown", total: "unknown" },
        claimed,
      ),
    ).toEqual({
      pageable: { kind: "unknown" },
      matched: { kind: "unknown" },
      total: { kind: "unknown" },
    });
  });

  it("holds an exact count to the lower bound the declaration allows", () => {
    expect(
      publishing(
        { pageable: "at-least", matched: "at-least", total: "at-least" },
        claimed,
      ),
    ).toEqual({
      pageable: { kind: "at-least", value: 1 },
      matched: { kind: "at-least", value: 2 },
      total: { kind: "unknown" },
    });
  });

  it("publishes an exact count a source is declared to answer exactly", () => {
    expect(
      publishing(
        { pageable: "exact", matched: "exact", total: "exact" },
        claimed,
      ),
    ).toEqual(claimed);
  });

  it("publishes a count of no rows as the exact count it is", () => {
    // Zero rows is a number of rows; only a value that is not one counts
    // nothing, and page numbers derive from this count.
    expect(
      publishing(
        { pageable: "exact", matched: "exact", total: "exact" },
        { pageable: exact(0), matched: exact(0), total: exact(0) },
      ),
    ).toEqual({ pageable: exact(0), matched: exact(0), total: exact(0) });
  });

  it.each([
    ["not a number", Number.NaN],
    ["fractional", 1.5],
    ["negative", -1],
    ["past the safe range", Number.MAX_SAFE_INTEGER + 2],
  ])("counts nothing where a source claims a %s count", (_kind, value) => {
    // A count is a number of rows. Anything else would reach a page total
    // as NaN, a fraction or a negative, and page numbers derive from it.
    expect(
      publishing(
        { pageable: "exact", matched: "exact", total: "exact" },
        {
          pageable: { kind: "exact", value },
          matched: exact(2),
          total: exact(3),
        },
      ),
    ).toEqual({
      pageable: { kind: "unknown" },
      matched: exact(2),
      total: exact(3),
    });
  });

  it("holds the counts of an external change as well", () => {
    const source = manual(
      declare({
        ...permissive,
        counts: { pageable: "unknown", matched: "unknown", total: "unknown" },
      }),
    );
    const { host, release } = running(source.source);
    host.refresh();
    source.callAt(0).deliver(succeeded(rows));
    source.callAt(0).deliver(succeeded(rows.slice(0, 1)));
    expect(idsOf(host.state.get())).toEqual(["a"]);
    expect(host.state.get().result.counts).toEqual({
      pageable: { kind: "unknown" },
      matched: { kind: "unknown" },
      total: { kind: "unknown" },
    });
    release();
  });

  it("leaves a failure alone on a source that declares no count", () => {
    const source = manual(
      declare({
        ...permissive,
        counts: { pageable: "unknown", matched: "unknown", total: "unknown" },
      }),
    );
    const { host, release } = running(source.source);
    host.refresh();
    source.callAt(0).deliver(failed("no route"));
    expect(problemOf(host.state.get())).toMatchObject({
      status: "failed",
      failure: { reason: "no route" },
    });
    release();
  });
});
