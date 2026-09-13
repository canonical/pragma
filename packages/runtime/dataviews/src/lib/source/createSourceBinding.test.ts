import { describe, expect, it, vi } from "vitest";
import { declare, declareSort } from "../../../testing/fixtures.js";
import {
  type CollectionState,
  createCollectionCoordinator,
} from "../collection/index.js";
import { type Channel, createChannel } from "../observable/index.js";
import { createOperation } from "../operation/index.js";
import { createDataViewsProvider } from "../provider/index.js";
import { DEFAULT_WINDOW, type Slice } from "../query/index.js";
import type {
  Count,
  SourceDelivery,
  SourcePage,
  SourceRefusal,
} from "../result/index.js";
import type { RowRecord } from "../rows/index.js";
import { createSchema } from "../schema/index.js";
import { createSelection } from "../selection/index.js";
import createArraySource from "./createArraySource.js";
import createSourceBinding from "./createSourceBinding.js";
import type {
  ActionCapabilities,
  Source,
  SourceActionRunner,
  SourceCapabilities,
  SourceHost,
  SourceRequest,
} from "./types.js";

const schema = createSchema([
  { field: "status", kind: "choices", options: ["failed", "ready"] },
  { field: "cpu", kind: "number" },
]);

const provider = () => createDataViewsProvider({ schema });

/** Everything the fixture query needs, and three exact counts. */
const permissive: SourceCapabilities = declare({
  filter: { status: ["eq"], cpu: ["gte", "lte"] },
  search: { fields: ["name"] },
  sort: declareSort(["cpu"], 2),
  counts: { pageable: "exact", matched: "exact", total: "exact" },
});

const exact = (value: number): Count => ({ kind: "exact", value });

const pageOf = (rows: readonly RowRecord[]): SourcePage => ({
  rows,
  groups: null,
  counts: {
    pageable: exact(rows.length),
    matched: exact(rows.length),
    total: exact(rows.length),
  },
  more: null,
  cursors: null,
});

const succeeded = (rows: readonly RowRecord[]): SourceDelivery => ({
  status: "succeeded",
  page: pageOf(rows),
});

const failed = (reason: string): SourceDelivery => ({
  status: "failed",
  failure: { reason, cause: new Error(reason), transient: null },
});

type ManualCall = {
  readonly request: SourceRequest;
  readonly deliver: (delivery: SourceDelivery) => void;
  releases: number;
};

/** A source whose deliveries the test drives by hand. */
const manual = (capabilities: SourceCapabilities = permissive) => {
  const calls: ManualCall[] = [];
  const source: Source = {
    capabilities,
    execute(request, deliver) {
      const call: ManualCall = { request, deliver, releases: 0 };
      calls.push(call);
      return () => {
        call.releases += 1;
      };
    },
  };
  /** The nth execution, or a failure rather than a skipped assertion. */
  const callAt = (index: number): ManualCall => {
    const call = calls[index];
    if (call === undefined) {
      throw new Error(`expected an execution at index ${index}`);
    }
    return call;
  };
  return { calls, source, callAt };
};

/** The slice a query-wide target set carries; no source executes one yet. */
const wholeQuery: Slice = { filter: [], search: null, sort: [], group: [] };

const rows = [
  { id: "a", name: "Alpha", cpu: 4 },
  { id: "b", name: "beta", cpu: 12 },
  { id: "c", name: "Gamma", cpu: 8 },
];

const localSchema = createSchema([
  { field: "id", kind: "text" },
  { field: "name", kind: "text" },
  { field: "cpu", kind: "number" },
  { field: "status", kind: "choices", options: ["failed", "ready"] },
]);

const local = () =>
  createArraySource<RowRecord>({
    rows,
    schema: localSchema,
    searchFields: ["name"],
  });

const idsOf = (state: CollectionState) =>
  (state.result.rows ?? []).map((row) => (row as { id: string }).id);

/** The problem the host last published, or null rather than a skipped test. */
const problemOf = (state: CollectionState) => state.result.problem;

/**
 * A host over a real coordinator that counts its channel subscribers and
 * can issue a request, or die, without publishing it — the two ways a
 * delivery reaches a host whose state the binding has not seen.
 */
const structuralHost = () => {
  const coordinator = createCollectionCoordinator();
  const channel = createChannel<CollectionState>(coordinator.state, {
    equals: (a, b) => a === b,
  });
  let subscribers = 0;
  let silent = false;
  const counting: Channel<CollectionState> = {
    get: channel.get,
    set: channel.set,
    subscribe(listener) {
      subscribers += 1;
      const off = channel.subscribe(listener);
      return () => {
        subscribers -= 1;
        off();
      };
    },
  };
  const publish = (): void => {
    if (!silent) {
      channel.set(coordinator.state);
    }
  };
  const host: SourceHost = {
    capabilities: null,
    state: counting,
    selection: createSelection(),
    refresh() {
      const requestId = coordinator.refresh();
      publish();
      return requestId;
    },
    complete(requestId, completion) {
      const published = coordinator.complete(requestId, completion);
      publish();
      return published;
    },
    invokeAction: (invocation) =>
      createOperation({ ...invocation, selectionRevision: 0 }),
  };
  const quietly = <T>(act: () => T): T => {
    silent = true;
    try {
      return act();
    } finally {
      silent = false;
    }
  };
  return {
    host,
    coordinator,
    subscribers: () => subscribers,
    issueSilently: () => quietly(() => coordinator.refresh()),
    disposeSilently: () => quietly(() => coordinator.dispose()),
  };
};

describe("createSourceBinding construction", () => {
  it("binds a host told its source's own declaration, however spelled", () => {
    const spelled = declare({
      ...permissive,
      // A field declared with no operator is a field not declared.
      filter: { ...permissive.filter, owner: [] },
      search: { fields: ["name", "owner"] },
      sort: declareSort(["cpu", "status"], 2),
      group: {
        fields: ["status", "cpu"],
        levels: 1,
        summaries: "none",
        collapse: false,
      },
      actions: { stop: { targets: "explicit", limit: null } },
    });
    const source: Source = {
      capabilities: spelled,
      execute: () => () => {},
      runAction: () => Promise.resolve([]),
    };
    const told = createDataViewsProvider({
      schema,
      capabilities: {
        ...spelled,
        // Every list is a set: order and repetition say nothing.
        filter: { cpu: ["lte", "gte", "gte"], status: ["eq"], zone: [] },
        search: { fields: ["owner", "name", "name"] },
        sort: declareSort(["status", "cpu", "cpu"], 2),
        group: {
          fields: ["cpu", "status", "status"],
          levels: 1,
          summaries: "none",
          collapse: false,
        },
      },
    });
    const binding = createSourceBinding({ host: told, source });
    // The same offer, spelled twice, is one offer: the binding takes it,
    // and what it hands back is the declaration normalised — a field
    // declared with no operator list reads as one that cannot be filtered.
    expect(binding.capabilities.filter).toEqual({
      status: ["eq"],
      cpu: ["gte", "lte"],
      owner: [],
    });
    expect(binding.capabilities.sort.fields).toEqual(["cpu", "status"]);
  });

  it.each([
    ["operator set (narrower)", { filter: { status: ["eq"], cpu: ["gte"] } }],
    [
      "operator set (substituted)",
      { filter: { status: ["eq"], cpu: ["gte", "eq"] } },
    ],
    ["search field", { search: { fields: ["name", "owner"] } }],
    ["search at all", { search: null }],
    ["sortable field", { sort: declareSort(["cpu", "status"], 2) }],
    ["sort-term limit", { sort: declareSort(["cpu"], 3) }],
    [
      "default ordering",
      {
        sort: {
          ...declareSort(["cpu"], 2),
          default: [{ field: "cpu", direction: "desc" }],
        },
      },
    ],
    [
      "groupable field",
      {
        group: {
          fields: ["status"],
          levels: 1,
          summaries: "none",
          collapse: false,
        },
      },
    ],
    [
      "count",
      { counts: { pageable: "unknown", matched: "unknown", total: "unknown" } },
    ],
    [
      "pagination",
      { pagination: { kind: "cursor", backward: false, durable: true } },
    ],
    ["selection scope", { selection: { scope: "query" } }],
    ["row operation", { actions: { stop: { targets: "explicit", limit: 1 } } }],
  ] as const)("refuses a host told a different %s", (_part, difference) => {
    const told = createDataViewsProvider({
      schema,
      capabilities: { ...permissive, ...difference },
    });
    expect(() =>
      createSourceBinding({ host: told, source: manual().source }),
    ).toThrow(
      "the host was told different capabilities from those its source declares",
    );
  });

  it.each([
    [
      "row operations it has no port for",
      {
        capabilities: declare({
          actions: { stop: { targets: "explicit", limit: null } },
        }),
      },
      "this source declares row operations it has no port for",
    ],
    [
      "a row-operation port it names no operation for",
      { runAction: (() => Promise.resolve([])) as SourceActionRunner },
      "this source offers a row-operation port it declares no operation for",
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
  ])("refuses a source declaring %s", (_part, difference, message) => {
    expect(() =>
      createSourceBinding({
        host: provider(),
        source: { ...manual().source, ...difference },
      }),
    ).toThrow(message);
  });

  it("binds a cursor source that says which pages it cannot reach", () => {
    expect(() =>
      createSourceBinding({
        host: provider(),
        source: {
          ...manual(
            declare({
              pagination: { kind: "cursor", backward: true, durable: true },
            }),
          ).source,
          refusals: () => [],
        },
      }),
    ).not.toThrow();
  });

  it("binds a host told the same declaration in another key order", () => {
    // The host holds a rebuilt copy, whose members are spelled in one fixed
    // order; a source's own literal may spell them in any. The same offer
    // written twice is one offer.
    const told = createDataViewsProvider({ schema, capabilities: permissive });
    const source = manual({
      ...permissive,
      counts: { total: "exact", matched: "exact", pageable: "exact" },
    }).source;
    expect(() => createSourceBinding({ host: told, source })).not.toThrow();
  });

  it("offers a frozen copy, so the declaration cannot move under it", () => {
    const declared: SourceCapabilities = { ...permissive };
    const binding = createSourceBinding({
      host: provider(),
      source: manual(declared).source,
    });
    expect(binding.capabilities).not.toBe(declared);
    expect(binding.capabilities).toEqual(declared);
    expect(Object.isFrozen(binding.capabilities)).toBe(true);
  });
});

describe("createSourceBinding refusals", () => {
  const query = (slice: Partial<Slice> = {}) => ({
    slice: { filter: [], search: null, sort: [], group: [], ...slice },
    window: DEFAULT_WINDOW,
  });

  it("collects the declaration's refusals for a request in hand", () => {
    const binding = createSourceBinding({
      host: provider(),
      source: manual().source,
    });
    expect(
      binding.refusals(query({ sort: [{ field: "cpu", direction: "asc" }] })),
    ).toEqual([]);
    expect(
      binding.refusals(query({ sort: [{ field: "zone", direction: "asc" }] })),
    ).toEqual([
      {
        part: "sort",
        code: "undeclared-field",
        field: "zone",
        operator: null,
        reason: 'field "zone" cannot be sorted',
      },
    ]);
  });

  it("asks the source only about a request the declaration allows", () => {
    const refusal: SourceRefusal = {
      part: "filter",
      code: "unsupported-combination",
      field: null,
      operator: null,
      reason: "this endpoint cannot search a filtered set",
    };
    const refusals = vi.fn().mockReturnValue([refusal]);
    const binding = createSourceBinding({
      host: provider(),
      source: { ...manual().source, refusals },
    });
    expect(
      binding.refusals(query({ sort: [{ field: "zone", direction: "asc" }] })),
    ).toMatchObject([{ part: "sort" }]);
    expect(refusals).not.toHaveBeenCalled();

    expect(binding.refusals(query({ search: "web" }))).toEqual([refusal]);
    expect(refusals).toHaveBeenCalledTimes(1);
  });

  it("refuses a request before it costs the source a round trip", () => {
    const host = provider();
    const source = manual(declare({ ...permissive, sort: declareSort([], 0) }));
    const release = createSourceBinding({
      host,
      source: source.source,
    }).observe();
    host.setSort([{ field: "cpu", direction: "asc" }]);
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
    const host = provider();
    const source = manual(
      declare({
        ...permissive,
        search: null,
        sort: declareSort([], 0),
      }),
    );
    const release = createSourceBinding({
      host,
      source: source.source,
    }).observe();
    host.adopt({
      slice: {
        filter: [],
        search: "web",
        sort: [{ field: "cpu", direction: "asc" }],
        group: [],
      },
      window: DEFAULT_WINDOW,
    });
    expect(source.calls).toHaveLength(0);
    const problem = problemOf(host.state.get());
    expect(problem?.status === "refused" && problem.refusals).toMatchObject([
      { part: "search", code: "undeclared-field" },
      { part: "sort", code: "too-many-terms" },
    ]);
    release();
  });

  it("treats a field declared with no operator list as unfilterable", () => {
    const host = provider();
    const source = manual(
      // Legal per the declaration type, and it must not read as "any operator".
      declare({
        ...permissive,
        filter: { status: ["eq"], cpu: [] },
      }),
    );
    const release = createSourceBinding({
      host,
      source: source.source,
    }).observe();
    host.fields.cpu.gte.set([1]);
    expect(source.calls).toHaveLength(0);
    expect(problemOf(host.state.get())).toMatchObject({
      status: "refused",
      refusals: [{ part: "filter", field: "cpu", operator: "gte" }],
    });
    release();
  });

  it("refuses a grouped query rather than answering it ungrouped", () => {
    const host = provider();
    const source = manual();
    const release = createSourceBinding({
      host,
      source: source.source,
    }).observe();
    host.refresh();
    source.callAt(0).deliver({ status: "succeeded", page: pageOf([]) });
    host.setGroup([{ field: "status" }]);
    // Refused at the boundary: the source is not asked, and the page stands.
    expect(source.calls).toHaveLength(1);
    expect(problemOf(host.state.get())).toMatchObject({
      status: "refused",
      refusals: [{ part: "group", reason: "this source cannot group" }],
    });
    release();
  });

  it("refuses a collapsed group on a source that cannot collapse", () => {
    const host = provider();
    const source = manual();
    const release = createSourceBinding({
      host,
      source: source.source,
    }).observe();
    host.refresh();
    source.callAt(0).deliver({ status: "succeeded", page: pageOf([]) });
    host.setCollapsed([["failed"]]);
    expect(source.calls).toHaveLength(1);
    expect(problemOf(host.state.get())).toMatchObject({
      status: "refused",
      refusals: [{ part: "window", code: "unsupported-collapse" }],
    });
    release();
  });

  it("refuses a cursor page on a source that pages by number", () => {
    const host = provider();
    const release = createSourceBinding({ host, source: local() }).observe();
    host.navigateWindow({ page: 2, cursor: "c1" });
    expect(problemOf(host.state.get())).toMatchObject({
      status: "refused",
      refusals: [{ part: "window", code: "unreachable-page" }],
    });
    release();
  });

  it("refuses what the source alone knows it cannot reach", () => {
    const host = provider();
    const source = manual();
    const release = createSourceBinding({
      host,
      source: {
        ...source.source,
        refusals: (query) =>
          query.slice.search === null
            ? []
            : [
                {
                  part: "search",
                  code: "unsupported-combination",
                  field: null,
                  operator: null,
                  reason: "this endpoint cannot search a filtered set",
                },
              ],
      },
    }).observe();
    host.refresh();
    expect(source.calls).toHaveLength(1);
    host.setSearch("web");
    expect(source.calls).toHaveLength(1);
    expect(problemOf(host.state.get())).toMatchObject({
      status: "refused",
      refusals: [{ code: "unsupported-combination" }],
    });
    release();
  });
});

describe("createSourceBinding", () => {
  it("executes nothing until it observes its host", () => {
    const host = provider();
    const source = manual();
    const binding = createSourceBinding({ host, source: source.source });
    const requestId = host.refresh();
    expect(source.calls).toHaveLength(0);

    const release = binding.observe();
    expect(source.calls).toHaveLength(1);
    expect(source.callAt(0).request.requestId).toBe(requestId);
    release();
  });

  it("refuses to observe one host twice", () => {
    const binding = createSourceBinding({
      host: provider(),
      source: manual().source,
    });
    const release = binding.observe();
    expect(() => binding.observe()).toThrow(
      "this binding is already observing its host",
    );
    release();
  });

  it("observes again once the first observation is released", () => {
    const host = provider();
    const source = manual();
    const binding = createSourceBinding({ host, source: source.source });
    binding.observe()();
    const release = binding.observe();
    host.refresh();
    expect(source.calls).toHaveLength(1);
    release();
  });

  it("executes nothing when it observes a settled host", () => {
    const host = provider();
    const requestId = host.refresh();
    if (requestId === null) {
      throw new Error("expected a refresh request");
    }
    host.complete(requestId, succeeded(rows));
    const source = manual();
    const release = createSourceBinding({
      host,
      source: source.source,
    }).observe();
    expect(source.calls).toHaveLength(0);
    expect(host.state.get().result.provenance?.requestId).toBe(requestId);
    expect(host.state.get().resultMatchesQuery).toBe(true);
    release();
  });

  it("executes nothing when it observes a disposed host", () => {
    const host = provider();
    host.refresh();
    host.dispose();
    const source = manual();
    createSourceBinding({ host, source: source.source }).observe();
    expect(source.calls).toHaveLength(0);
  });

  it("executes each newly issued request and publishes its completion", () => {
    const host = provider();
    const source = manual();
    const release = createSourceBinding({
      host,
      source: source.source,
    }).observe();
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
    const host = provider();
    const source = manual();
    const release = createSourceBinding({
      host,
      source: source.source,
    }).observe();
    host.fields.status.eq.set(["failed"]);
    host.setSearch("web");
    host.navigateWindow({ page: 2, size: 10 });
    const last = source.callAt(source.calls.length - 1).request;
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

  it("filters through the default source end to end", () => {
    const host = provider();
    const release = createSourceBinding({ host, source: local() }).observe();
    host.refresh();
    expect(idsOf(host.state.get())).toEqual(["a", "b", "c"]);
    host.fields.cpu.gte.set([8]);
    expect(idsOf(host.state.get())).toEqual(["b", "c"]);
    expect(host.state.get().result.counts?.matched).toEqual(exact(2));
    expect(host.state.get().result.counts?.total).toEqual(exact(3));
    release();
  });

  it("releases the previous request when a new one supersedes it", () => {
    const host = provider();
    const source = manual();
    const release = createSourceBinding({
      host,
      source: source.source,
    }).observe();
    host.refresh();
    host.setSearch("web");
    expect(source.calls).toHaveLength(2);
    expect(source.callAt(0).releases).toBe(1);
    expect(source.callAt(1).releases).toBe(0);
    release();
  });

  it("drops the completion of a superseded in-flight request", () => {
    const host = provider();
    const source = manual();
    const release = createSourceBinding({
      host,
      source: source.source,
    }).observe();
    host.refresh();
    host.setSearch("web");
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
    const host = provider();
    const source = manual();
    const release = createSourceBinding({
      host,
      source: source.source,
    }).observe();
    const requestId = host.refresh();
    expect(source.calls).toHaveLength(1);

    release();
    expect(source.callAt(0).releases).toBe(1);
    source.callAt(0).deliver(succeeded(rows));
    expect(host.state.get().result.rows).toBeNull();
    expect(host.state.get().result.status).toBe("refreshing");
    expect(host.state.get().pendingRequestId).toBe(requestId);
  });

  it("releases once however often the release is called", () => {
    const structural = structuralHost();
    const source = manual();
    const release = createSourceBinding({
      host: structural.host,
      source: source.source,
    }).observe();
    structural.host.refresh();
    expect(structural.subscribers()).toBe(1);

    release();
    release();
    expect(source.callAt(0).releases).toBe(1);
    expect(structural.subscribers()).toBe(0);
  });

  it("stops observing the host once released", () => {
    const host = provider();
    const source = manual();
    createSourceBinding({ host, source: source.source }).observe()();
    host.refresh();
    expect(source.calls).toHaveLength(0);
  });

  it("publishes a failure with the retained rows and the reason", () => {
    const host = provider();
    const source = manual();
    const release = createSourceBinding({
      host,
      source: source.source,
    }).observe();
    host.refresh();
    source.callAt(0).deliver(succeeded(rows));
    host.setSearch("web");
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
    const host = provider();
    const source = manual();
    const release = createSourceBinding({
      host,
      source: source.source,
    }).observe();
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
    const host = provider();
    let starts = 0;
    const release = createSourceBinding({
      host,
      source: {
        capabilities: permissive,
        execute() {
          starts += 1;
          throw new Error("no client configured");
        },
      },
    }).observe();
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
    const host = provider();
    let calls = 0;
    let releases = 0;
    /** The live execution's own delivery, captured to prove it still works. */
    let live: ((delivery: SourceDelivery) => void) | null = null;
    const release = createSourceBinding({
      host,
      source: {
        capabilities: permissive,
        execute(_request, deliver) {
          calls += 1;
          if (calls === 1) {
            // Settle this request and move the query on, so a second
            // execution is already running when this call fails.
            deliver(succeeded([]));
            host.setSearch("moved");
            throw new Error("late failure");
          }
          live = deliver;
          return () => {
            releases += 1;
          };
        },
      },
    }).observe();
    host.refresh();
    expect(calls).toBe(2);
    // The superseded request's failure must not publish over the request
    // that replaced it.
    expect(problemOf(host.state.get())).toBeNull();
    // And the newer execution is still the binding's: it publishes, and the
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
    const host = provider();
    const source = manual();
    const release = createSourceBinding({
      host,
      source: source.source,
    }).observe();
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

  // A column offering a sort its source never declared: every later query
  // carries the refused term and is refused too, and the rows shown are the
  // last ones that worked. They must say so rather than claim to be ready.
  it("reports rows kept past a refused sort as stale until the sort is cleared", () => {
    const fleet = Array.from({ length: 9 }, (_, index) => ({
      id: `m${index}`,
      status: index % 3 === 0 ? "failed" : "ready",
      cpu: (index % 4) + 1,
    }));
    const host = provider();
    const release = createSourceBinding({
      host,
      // The source holds no cpu field, so it cannot order by one.
      source: createArraySource<RowRecord>({
        rows: fleet,
        schema: createSchema(
          localSchema.fields.filter((field) => field.field !== "cpu"),
        ),
      }),
    }).observe();
    const observed = () => {
      const state = host.state.get();
      return {
        rows: state.result.rows?.length,
        status: state.result.status,
        matches: state.resultMatchesQuery,
        problem: state.result.problem?.status ?? null,
      };
    };
    host.refresh();
    expect(observed()).toEqual({
      rows: 9,
      status: "ready",
      matches: true,
      problem: null,
    });
    host.fields.status.eq.set(["failed"]);
    expect(observed()).toEqual({
      rows: 3,
      status: "ready",
      matches: true,
      problem: null,
    });
    host.setSort([{ field: "cpu", direction: "asc" }]);
    expect(observed()).toEqual({
      rows: 3,
      status: "stale",
      matches: false,
      problem: "refused",
    });
    host.fields.status.eq.set(["ready"]);
    expect(observed()).toEqual({
      rows: 3,
      status: "stale",
      matches: false,
      problem: "refused",
    });
    // The query stays as asked: the refused term is shown, never dropped.
    expect(host.state.get().slice.sort).toEqual([
      { field: "cpu", direction: "asc" },
    ]);
    host.setSort([]);
    expect(observed()).toEqual({
      rows: 6,
      status: "ready",
      matches: true,
      problem: null,
    });
    release();
  });

  it("releases the live request when the scope rotates", () => {
    const host = provider();
    const source = manual();
    const release = createSourceBinding({
      host,
      source: source.source,
    }).observe();
    host.refresh();
    host.rotateScope();
    expect(source.callAt(0).releases).toBe(1);
    expect(host.state.get().result.status).toBe("idle");

    // The pre-rotation execution can no longer publish into the new scope.
    source.callAt(0).deliver(succeeded(rows));
    expect(host.state.get().result.status).toBe("idle");

    const requestId = host.refresh();
    expect(source.calls).toHaveLength(2);
    expect(source.callAt(1).request.requestId).toBe(requestId);
    source.callAt(1).deliver(succeeded(rows.slice(0, 1)));
    expect(idsOf(host.state.get())).toEqual(["a"]);
    release();
  });

  it("keeps republishing external changes after a scope rotation", () => {
    const host = provider();
    const source = local();
    const release = createSourceBinding({ host, source }).observe();
    host.refresh();
    host.rotateScope();
    host.refresh();
    expect(idsOf(host.state.get())).toEqual(["a", "b", "c"]);

    source.setRows([{ id: "z", name: "Zed", cpu: 1 }]);
    expect(idsOf(host.state.get())).toEqual(["z"]);
    release();
  });

  it("releases the live request when the host is disposed", () => {
    const structural = structuralHost();
    const source = manual();
    createSourceBinding({
      host: structural.host,
      source: source.source,
    }).observe();
    structural.host.refresh();
    structural.coordinator.dispose();
    structural.host.complete("unused", failed("x"));
    expect(source.callAt(0).releases).toBe(1);
    expect(structural.subscribers()).toBe(0);
  });

  it("executes a request delivered synchronously by its own source", () => {
    const host = provider();
    const requestId = host.refresh();
    const release = createSourceBinding({ host, source: local() }).observe();
    expect(host.state.get().result).toMatchObject({
      status: "ready",
      provenance: { requestId },
    });
    release();
  });

  it("republishes an external change under a fresh request identity", () => {
    const host = provider();
    const source = local();
    const release = createSourceBinding({ host, source }).observe();
    const first = host.refresh();
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
    const host = provider();
    const source = manual();
    const release = createSourceBinding({
      host,
      source: source.source,
    }).observe();
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
    const host = provider();
    const source = manual();
    const release = createSourceBinding({
      host,
      source: source.source,
    }).observe();
    host.refresh();
    source.callAt(0).deliver(succeeded(rows));

    let armed = true;
    host.state.subscribe(() => {
      if (armed && host.state.get().result.status === "refreshing") {
        armed = false;
        host.setSearch("web");
      }
    });
    source.callAt(0).deliver(succeeded(rows.slice(0, 1)));

    const pending = host.state.get().pendingRequestId;
    expect(pending).not.toBeNull();
    expect(source.callAt(source.calls.length - 1).request.requestId).toBe(
      pending,
    );
    release();
  });

  it("releases a request superseded during its own synchronous delivery", () => {
    const host = provider();
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
    const release = createSourceBinding({ host, source: eager }).observe();
    let armed = true;
    host.state.subscribe(() => {
      if (armed && host.state.get().result.status === "ready") {
        armed = false;
        host.setSearch("web");
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

  it("drops an external change the binding is released mid-republish", () => {
    const host = provider();
    const source = local();
    const binding = createSourceBinding({ host, source });
    const release = binding.observe();
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
    const structural = structuralHost();
    const source = manual();
    const release = createSourceBinding({
      host: structural.host,
      source: source.source,
    }).observe();
    structural.host.refresh();
    source.callAt(0).deliver(succeeded(rows));
    expect(structural.host.state.get().result.counts?.matched).toEqual(
      exact(3),
    );

    structural.issueSilently();
    source.callAt(0).deliver(succeeded([]));
    expect(structural.host.state.get().result.counts?.matched).toEqual(
      exact(3),
    );
    release();
  });

  it("republishes nothing when the host will issue no further request", () => {
    const structural = structuralHost();
    const source = manual();
    const release = createSourceBinding({
      host: structural.host,
      source: source.source,
    }).observe();
    structural.host.refresh();
    source.callAt(0).deliver(succeeded(rows));

    structural.disposeSilently();
    source.callAt(0).deliver(succeeded([]));
    expect(idsOf(structural.host.state.get())).toEqual(["a", "b", "c"]);
    // Converging on the disposed host detaches the binding for good.
    expect(structural.subscribers()).toBe(0);
    release();
  });

  it("drops an external change once the host is disposed", () => {
    const host = provider();
    const source = local();
    const release = createSourceBinding({ host, source }).observe();
    host.refresh();
    host.dispose();
    source.setRows([]);
    expect(idsOf(host.state.get())).toEqual(["a", "b", "c"]);
    release();
  });
});

describe("createSourceBinding counts", () => {
  const publishing = (
    counts: SourceCapabilities["counts"],
    delivered: SourcePage["counts"],
  ) => {
    const host = provider();
    const source = manual(declare({ ...permissive, counts }));
    const release = createSourceBinding({
      host,
      source: source.source,
    }).observe();
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
    const host = provider();
    const source = manual(
      declare({
        ...permissive,
        counts: { pageable: "unknown", matched: "unknown", total: "unknown" },
      }),
    );
    const release = createSourceBinding({
      host,
      source: source.source,
    }).observe();
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
    const host = provider();
    const source = manual(
      declare({
        ...permissive,
        counts: { pageable: "unknown", matched: "unknown", total: "unknown" },
      }),
    );
    const release = createSourceBinding({
      host,
      source: source.source,
    }).observe();
    host.refresh();
    source.callAt(0).deliver(failed("no route"));
    expect(problemOf(host.state.get())).toMatchObject({
      status: "failed",
      failure: { reason: "no route" },
    });
    release();
  });
});

describe("createSourceBinding row operations", () => {
  const stopping = (
    host: ReturnType<typeof provider>,
    action: ActionCapabilities = { targets: "explicit", limit: null },
    scope: "explicit" | "query" = "explicit",
  ) => {
    const runAction = vi.fn<SourceActionRunner>();
    const binding = createSourceBinding({
      host,
      source: {
        ...manual(
          declare({
            ...permissive,
            selection: { scope },
            actions: { stop: action },
          }),
        ).source,
        runAction,
      },
    });
    return { runAction, binding };
  };

  const stop = (ids: readonly string[], payload?: unknown) => ({
    action: "stop",
    targets: { kind: "explicit" as const, ids },
    payload,
  });

  it("records per-target outcomes and clears successes from selection", async () => {
    const host = provider();
    host.selection.set(["a", "b", "c"]);
    const { runAction, binding } = stopping(host);
    runAction.mockResolvedValueOnce([
      { target: "a", status: "succeeded" },
      { target: "b", status: "failed", reason: "locked by ex:bo" },
      { target: "c", status: "succeeded" },
    ]);

    const operation = await binding.runAction(
      stop(["a", "b", "c"], { force: true }),
    );
    expect(operation.state).toEqual({
      targets: ["a", "b", "c"],
      payload: { force: true },
      selectionRevision: 1,
      status: "failed",
      succeeded: ["a", "c"],
      failed: [{ target: "b", reason: "locked by ex:bo" }],
      remaining: [],
    });
    expect([...host.selection.state.get().ids]).toEqual(["b"]);
  });

  it("passes the deduplicated captured targets to the source", async () => {
    const { runAction, binding } = stopping(provider());
    runAction.mockResolvedValueOnce([]);
    await binding.runAction(stop(["a", "a", "b"]));
    expect(runAction).toHaveBeenCalledTimes(1);
    expect(runAction).toHaveBeenCalledWith({
      action: "stop",
      targets: { kind: "explicit", ids: ["a", "b"] },
      payload: undefined,
    });
  });

  it("fails a captured target the source reported nothing for", async () => {
    const host = provider();
    host.selection.set(["a", "b"]);
    const { runAction, binding } = stopping(host);
    runAction.mockResolvedValueOnce([{ target: "a", status: "succeeded" }]);

    const operation = await binding.runAction(stop(["a", "b"]));
    expect(operation.state).toMatchObject({
      status: "failed",
      succeeded: ["a"],
      failed: [{ target: "b", reason: "the source reported no outcome" }],
      remaining: [],
    });
    expect([...host.selection.state.get().ids]).toEqual(["b"]);
  });

  it("ignores outcomes for targets it never captured", async () => {
    const { runAction, binding } = stopping(provider());
    runAction.mockResolvedValueOnce([
      { target: "a", status: "succeeded" },
      { target: "elsewhere", status: "succeeded" },
    ]);
    const operation = await binding.runAction(stop(["a"]));
    expect(operation.state.succeeded).toEqual(["a"]);
  });

  it("records a rejected operation as a failure of every target", async () => {
    const host = provider();
    host.selection.set(["a", "b"]);
    const { runAction, binding } = stopping(host);
    runAction.mockRejectedValueOnce(new Error("network down"));

    const operation = await binding.runAction(stop(["a", "b"]));
    expect(operation.state).toMatchObject({
      status: "failed",
      succeeded: [],
      failed: [
        { target: "a", reason: "network down" },
        { target: "b", reason: "network down" },
      ],
    });
    expect([...host.selection.state.get().ids]).toEqual(["a", "b"]);
  });

  it("describes a non-Error rejection by its string form", async () => {
    const { runAction, binding } = stopping(provider());
    runAction.mockRejectedValueOnce("gateway timeout");
    const operation = await binding.runAction(stop(["a"]));
    expect(operation.state.failed).toEqual([
      { target: "a", reason: "gateway timeout" },
    ]);
  });

  it("describes a rejection with no string form at all", async () => {
    const { runAction, binding } = stopping(provider());
    runAction.mockRejectedValueOnce(Object.create(null));
    const operation = await binding.runAction(stop(["a"]));
    expect(operation.state.failed).toEqual([
      { target: "a", reason: "unknown error" },
    ]);
  });

  it("describes a rejection carrying an empty message", async () => {
    const { runAction, binding } = stopping(provider());
    runAction.mockRejectedValueOnce(new Error());
    const operation = await binding.runAction(stop(["a"]));
    expect(operation.state.failed).toEqual([{ target: "a", reason: "Error" }]);
  });

  it("refuses to act on a source that declares no row operations", async () => {
    const binding = createSourceBinding({
      host: provider(),
      source: manual().source,
    });
    await expect(binding.runAction(stop(["a"]))).rejects.toThrow(
      "this source declares no row operations",
    );
  });

  it("refuses an operation the declaration does not name", async () => {
    const { binding } = stopping(provider());
    await expect(
      binding.runAction({ ...stop(["a"]), action: "restart" }),
    ).rejects.toThrow('this source declares no "restart" operation');
  });

  it("refuses a query-wide target set the declaration does not allow", async () => {
    const { runAction, binding } = stopping(provider());
    await expect(
      binding.runAction({
        action: "stop",
        targets: { kind: "query", slice: wholeQuery, except: [] },
        payload: null,
      }),
    ).rejects.toThrow('"stop" addresses explicitly captured rows only');
    expect(runAction).not.toHaveBeenCalled();
  });

  it("refuses a query-wide target set nothing has implemented yet", async () => {
    const { binding } = stopping(
      provider(),
      { targets: "query", limit: null },
      "query",
    );
    await expect(
      binding.runAction({
        action: "stop",
        targets: { kind: "query", slice: wholeQuery, except: ["a"] },
        payload: null,
      }),
    ).rejects.toThrow('running "stop" over a whole query is not implemented');
  });

  it.each([
    [1, '"stop" addresses at most 1 row at a time'],
    [2, '"stop" addresses at most 2 rows at a time'],
  ])("refuses more than the %i rows it declares", async (limit, message) => {
    const { runAction, binding } = stopping(provider(), {
      targets: "explicit",
      limit,
    });
    await expect(binding.runAction(stop(["a", "b", "c"]))).rejects.toThrow(
      message,
    );
    expect(runAction).not.toHaveBeenCalled();
  });

  it("runs a call that fits the declared limit", async () => {
    const { runAction, binding } = stopping(provider(), {
      targets: "explicit",
      limit: 2,
    });
    runAction.mockResolvedValueOnce([{ target: "a", status: "succeeded" }]);
    const operation = await binding.runAction(stop(["a"]));
    expect(operation.state.status).toBe("succeeded");
  });

  it("runs a call addressing exactly the rows it declares", async () => {
    // The declared number is a ceiling the source can serve, not one it
    // stops short of.
    const { runAction, binding } = stopping(provider(), {
      targets: "explicit",
      limit: 2,
    });
    runAction.mockResolvedValueOnce([
      { target: "a", status: "succeeded" },
      { target: "b", status: "succeeded" },
    ]);
    const operation = await binding.runAction(stop(["a", "b"]));
    expect(operation.state.status).toBe("succeeded");
    expect(runAction).toHaveBeenCalledWith({
      action: "stop",
      targets: { kind: "explicit", ids: ["a", "b"] },
      payload: undefined,
    });
  });
});
