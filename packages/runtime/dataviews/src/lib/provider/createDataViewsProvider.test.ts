import { describe, expect, it, vi } from "vitest";
import createCountingViewStore from "../../../testing/createCountingViewStore.js";
import createManualSource from "../../../testing/createManualSource.js";
import { NOTHING_DECLARED, pageOf } from "../../../testing/fixtures.js";
import type { ActionOutcome } from "../action/index.js";
import { createCollection } from "../collection/index.js";
import { createMemoryLocation, type QueryLocation } from "../location/index.js";
import {
  DEFAULT_WINDOW,
  EMPTY_SLICE,
  type Predicate,
  type Slice,
} from "../query/index.js";
import type { Completion, SourceDelivery } from "../result/index.js";
import type { RowIdentifier } from "../rows/index.js";
import {
  declareCapabilities,
  type SourceActionRunner,
  type SourceCapabilities,
} from "../source/index.js";
import createDataViewsProvider from "./createDataViewsProvider.js";
import isDataViewsProvider from "./isDataViewsProvider.js";
import readProviderHost from "./readProviderHost.js";

type Machine = {
  readonly id: string;
  readonly name?: string;
  readonly cpu?: number;
};

/** The machines collection, over the identity given or the row's own `id`. */
const machineCollection = (
  identify: RowIdentifier<Machine> = (row) => row.id,
) =>
  createCollection({
    fields: [
      { field: "status", kind: "choices", options: ["failed", "cancelled"] },
      { field: "cpu", kind: "number", min: 0, max: 64 },
      { field: "owner", kind: "flag" },
      { field: "updated", kind: "date" },
      { field: "name", kind: "text" },
    ],
    identify,
  });

const machines = machineCollection();

/** Everything the fixture queries need: a status filter, search and two sortable fields. */
const permissive: SourceCapabilities = declareCapabilities(machines, {
  filter: { status: ["eq"], cpu: ["gte", "lte"] },
  search: ["name"],
  sort: { fields: ["cpu", "updated"], terms: 2 },
  counts: { pageable: "exact", matched: "exact", total: "exact" },
});

const delivered = <TRow extends object>(
  rows: readonly TRow[],
): SourceDelivery<TRow> => ({ status: "succeeded", page: pageOf(rows) });

const FAILED: Completion<Machine> = {
  status: "failed",
  failure: { reason: "offline", cause: null, transient: true },
};

const REFUSED: Completion<Machine> = {
  status: "refused",
  refusals: [
    {
      part: "sort",
      code: "undeclared-field",
      field: "cpu",
      operator: null,
      reason: 'field "cpu" cannot be ordered',
    },
  ],
};

/** A provider over the machines and a manual source declaring `capabilities`. */
const machineProvider = (capabilities: SourceCapabilities = permissive) => {
  const manual = createManualSource<Machine>({ capabilities });
  const provider = createDataViewsProvider({
    collection: machines,
    source: manual.source,
  });
  return { ...manual, provider, host: readProviderHost(provider) };
};

/** The seed the machines provider writes into a location carrying no query. */
const SEED_PARAMS = `page=${DEFAULT_WINDOW.page}&size=${DEFAULT_WINDOW.size}`;

const STATUS_FAILED: Predicate = {
  field: "status",
  operator: "eq",
  operands: ["failed"],
};

describe("createDataViewsProvider", () => {
  it("assembles the collection, the selection and no views without a store", () => {
    const { provider } = machineProvider();
    expect(isDataViewsProvider(provider)).toBe(true);
    expect(isDataViewsProvider({ ...provider })).toBe(false);
    expect(provider.collection).toBe(machines);
    expect(provider.selection.state.get().ids.size).toBe(0);
    expect(provider.views).toBeNull();
    expect(provider.state.get().result.status).toBe("idle");
  });

  it("exposes only the public surface", () => {
    const { provider } = machineProvider();
    expect(Object.keys(provider).sort()).toEqual([
      "capabilities",
      "collection",
      "issues",
      "navigateWindow",
      "observe",
      "refresh",
      "refusals",
      "reset",
      "rows",
      "runAction",
      "selection",
      "setCollapsed",
      "setGroup",
      "setSearch",
      "setSort",
      "state",
      "views",
    ]);
    for (const removed of [
      "dispose",
      "complete",
      "adopt",
      "fields",
      "schema",
      "types",
      "applicability",
      "recordType",
      "invokeAction",
      "rotateScope",
    ]) {
      expect(provider).not.toHaveProperty(removed);
    }
  });

  it("hands every channel outward read-only", () => {
    const { provider, host } = machineProvider();
    for (const channel of [
      provider.state,
      provider.rows,
      provider.issues,
      host.state,
    ]) {
      expect(Object.isFrozen(channel)).toBe(true);
      expect(channel).not.toHaveProperty("set");
      expect(Object.keys(channel)).toEqual(["get", "subscribe"]);
    }
  });

  it("hands the selection's and the views' state outward read-only", () => {
    const { store } = createCountingViewStore();
    const { source } = createManualSource<Machine>({
      capabilities: permissive,
    });
    const provider = createDataViewsProvider({
      collection: machines,
      source,
      views: store,
    });
    if (provider.views === null) {
      throw new Error("expected views over the store given");
    }
    for (const channel of [provider.selection.state, provider.views.state]) {
      expect(Object.isFrozen(channel)).toBe(true);
      expect(channel).not.toHaveProperty("set");
      expect(Object.keys(channel)).toEqual(["get", "subscribe"]);
    }
  });

  it("carries the source's declaration as a frozen copy, never null", () => {
    const { provider, source } = machineProvider();
    expect(provider.capabilities).toEqual(source.capabilities);
    expect(provider.capabilities).not.toBe(source.capabilities);
    expect(Object.isFrozen(provider.capabilities)).toBe(true);
    expect(Object.isFrozen(provider.capabilities.sort.fields)).toBe(true);
    expect(machineProvider(NOTHING_DECLARED).provider.capabilities).toEqual(
      NOTHING_DECLARED,
    );
  });

  it("pairs the provider with its host, and nothing else", () => {
    const { provider, host } = machineProvider();
    expect(readProviderHost(provider)).toBe(host);
    expect(host.collection).toBe(machines);
    expect(host.capabilities).toBe(provider.capabilities);
    expect(host.state).toBe(provider.state);
    expect(() => readProviderHost({} as never)).toThrow(
      "readProviderHost requires a provider created by createDataViewsProvider",
    );
    // A structural copy is not the provider this package built.
    expect(() => readProviderHost({ ...provider })).toThrow();
  });

  it("subscribes to nothing at construction", () => {
    const { source, calls } = createManualSource<Machine>({
      capabilities: permissive,
    });
    const memory = createMemoryLocation();
    const subscribe = vi.fn(memory.subscribe);
    const location: QueryLocation = { ...memory, subscribe };
    const views = createCountingViewStore();
    const provider = createDataViewsProvider({
      collection: machines,
      source,
      location,
      views: views.store,
    });
    expect(calls).toHaveLength(0);
    expect(subscribe).not.toHaveBeenCalled();
    expect(views.subscribers).toBe(0);
    expect(provider.state.get().result.status).toBe("idle");
    expect(provider.state.get().pendingRequestId).toBeNull();
    expect(location.read().toString()).toBe("");
  });
});

describe("createDataViewsProvider observe", () => {
  it("starts on the first observer and stops on the last release", () => {
    const { source, calls, callAt } = createManualSource<Machine>({
      capabilities: permissive,
    });
    const location = createMemoryLocation();
    const views = createCountingViewStore();
    const provider = createDataViewsProvider({
      collection: machines,
      source,
      location,
      views: views.store,
    });
    const releaseFirst = provider.observe();
    const releaseSecond = provider.observe();
    // One start for two observers: the source executes once.
    expect(calls).toHaveLength(1);
    expect(views.subscribers).toBe(1);
    expect(provider.views?.state.get().listing.status).toBe("pending");
    const first = callAt(0);

    releaseFirst();
    releaseFirst();
    expect(first.releases).toBe(0);
    expect(views.subscribers).toBe(1);

    releaseSecond();
    expect(first.releases).toBe(1);
    expect(views.subscribers).toBe(0);

    // The request is still pending, so the next observer executes it again.
    const releaseThird = provider.observe();
    expect(calls).toHaveLength(2);
    expect(callAt(1).request.requestId).toBe(first.request.requestId);
    expect(callAt(1).request.slice).toEqual(first.request.slice);
    releaseThird();
    expect(callAt(1).releases).toBe(1);

    // The location loop is stopped too: an external change is not adopted.
    location.write(new URLSearchParams(`status=failed&${SEED_PARAMS}`));
    expect(provider.state.get().slice.filter).toEqual([]);
    expect(calls).toHaveLength(2);
  });

  it("asks the source for the location's query first, and once", () => {
    const { source, calls, callAt } = createManualSource<Machine>({
      capabilities: permissive,
    });
    const location = createMemoryLocation({ href: "/?status=failed" });
    const provider = createDataViewsProvider({
      collection: machines,
      source,
      location,
    });
    const release = provider.observe();
    // No seed request followed by a second fetch for the location.
    expect(calls).toHaveLength(1);
    expect(callAt(0).request.slice.filter).toEqual([STATUS_FAILED]);
    expect(callAt(0).request.window).toEqual(DEFAULT_WINDOW);
    expect(provider.state.get().slice.filter).toEqual([STATUS_FAILED]);
    expect(provider.state.get().pendingRequestId).toBe(
      callAt(0).request.requestId,
    );
    expect(location.read().toString()).toBe(`status=failed&${SEED_PARAMS}`);
    release();
  });

  it("writes the seed into a location carrying no query, and asks once", () => {
    const { source, calls, callAt } = createManualSource<Machine>({
      capabilities: permissive,
    });
    const location = createMemoryLocation({ href: "/?tab=machines" });
    const provider = createDataViewsProvider({
      collection: machines,
      source,
      location,
    });
    const release = provider.observe();
    expect(calls).toHaveLength(1);
    expect(callAt(0).request.slice).toEqual(EMPTY_SLICE);
    // The host's own parameter survives beside the seed.
    expect(location.read().toString()).toBe(`tab=machines&${SEED_PARAMS}`);
    release();
  });

  it("publishes what the source delivers and refreshes over retained rows", () => {
    const { provider, callAt, calls } = machineProvider();
    const release = provider.observe();
    callAt(0).deliver(delivered([{ id: "m-1" }]));
    expect(provider.state.get().result.status).toBe("ready");
    expect(provider.rows.get().ids).toEqual(["m-1"]);
    expect(provider.refresh()).toBeUndefined();
    expect(calls).toHaveLength(2);
    expect(provider.state.get().result.status).toBe("refreshing");
    expect(provider.rows.get().ids).toEqual(["m-1"]);
    callAt(1).deliver(delivered([{ id: "m-2" }]));
    expect(provider.rows.get().ids).toEqual(["m-2"]);
    release();
  });

  it("reports no issues without a location, on a channel that stays empty", () => {
    const { provider } = machineProvider();
    expect(provider.issues.get()).toEqual([]);
    expect(Object.isFrozen(provider.issues.get())).toBe(true);
    expect(Object.isFrozen(provider.issues)).toBe(true);
    expect(provider.issues).not.toHaveProperty("set");
    const release = provider.observe();
    provider.setSearch("yak");
    expect(provider.issues.get()).toEqual([]);
    release();
  });

  it("reports a location clause the source refuses as an issue", () => {
    const { source, callAt } = createManualSource<Machine>({
      capabilities: NOTHING_DECLARED,
    });
    const location = createMemoryLocation({ href: "/?status=failed" });
    const provider = createDataViewsProvider({
      collection: machines,
      source,
      location,
    });
    expect(provider.issues.get()).toEqual([]);
    const release = provider.observe();
    expect(provider.issues.get()).toEqual([
      { parameter: "status", reason: 'field "status" cannot be filtered' },
    ]);
    // The refused clause never reaches the source; the rest of the query does.
    expect(callAt(0).request.slice.filter).toEqual([]);
    release();
  });
});

describe("createDataViewsProvider commands", () => {
  it("navigates the window and replaces sort and search", () => {
    const { provider, calls } = machineProvider();
    const release = provider.observe();
    expect(provider.navigateWindow({ page: 2 })).toEqual([]);
    expect(provider.state.get().window).toEqual({ ...DEFAULT_WINDOW, page: 2 });
    expect(provider.navigateWindow({ size: 25 })).toEqual([]);
    expect(provider.state.get().window).toEqual({
      ...DEFAULT_WINDOW,
      page: 2,
      size: 25,
    });
    expect(provider.setSort([{ field: "updated", direction: "desc" }])).toEqual(
      [],
    );
    expect(provider.state.get().slice.sort).toEqual([
      { field: "updated", direction: "desc" },
    ]);
    expect(provider.setSearch("yak")).toEqual([]);
    expect(provider.state.get().slice.search).toBe("yak");
    // One request per accepted transition, after the first page's.
    expect(calls).toHaveLength(5);
    release();
  });

  it("issues no request for a command that changes nothing", () => {
    const { provider, calls } = machineProvider();
    const release = provider.observe();
    let notifications = 0;
    provider.state.subscribe(() => {
      notifications += 1;
    });
    expect(provider.setSearch("")).toEqual([]);
    expect(provider.navigateWindow({ page: 1 })).toEqual([]);
    expect(provider.setSort([])).toEqual([]);
    expect(notifications).toBe(0);
    expect(calls).toHaveLength(1);
    release();
  });

  it("refuses a reserved or undeclared command at the boundary", () => {
    const { source, calls } = createManualSource<Machine>({
      capabilities: permissive,
    });
    const location = createMemoryLocation();
    const provider = createDataViewsProvider({
      collection: machines,
      source,
      location,
    });
    const release = provider.observe();
    const before = provider.state.get();
    let notifications = 0;
    provider.state.subscribe(() => {
      notifications += 1;
    });

    expect(provider.setGroup([{ field: "status" }])).toEqual([
      {
        part: "group",
        code: "too-many-levels",
        field: null,
        operator: null,
        reason: "this source cannot group",
      },
    ]);
    expect(provider.setCollapsed([["failed"]])).toEqual([
      {
        part: "window",
        code: "unsupported-collapse",
        field: null,
        operator: null,
        reason: "this source cannot leave collapsed groups out of a page",
      },
    ]);
    expect(provider.setSort([{ field: "name", direction: "asc" }])).toEqual([
      {
        part: "sort",
        code: "undeclared-field",
        field: "name",
        operator: null,
        reason: 'field "name" cannot be sorted',
      },
    ]);

    // Nothing moved: no publication, no request, no location write.
    expect(provider.state.get()).toBe(before);
    expect(notifications).toBe(0);
    expect(calls).toHaveLength(1);
    expect(location.read().has("group")).toBe(false);
    expect(location.read().has("sort")).toBe(false);
    expect(location.read().toString()).toBe(SEED_PARAMS);

    // An accepted command moves everything.
    expect(provider.setSort([{ field: "cpu", direction: "asc" }])).toEqual([]);
    expect(notifications).toBe(1);
    expect(calls).toHaveLength(2);
    expect(location.read().getAll("sort")).toEqual(["cpu__asc"]);
    release();
  });

  it("collects the source's own refusals behind the declaration's", () => {
    const { source } = createManualSource<Machine>({
      capabilities: permissive,
      refusals: (query) =>
        query.slice.search === null
          ? []
          : [
              {
                part: "search",
                code: "unsupported-combination",
                field: null,
                operator: null,
                reason: "search cannot be combined with a filter",
              },
            ],
    });
    const provider = createDataViewsProvider({ collection: machines, source });
    const search: Slice = { ...EMPTY_SLICE, search: "yak" };
    const refused = provider.refusals({
      slice: search,
      window: DEFAULT_WINDOW,
    });
    expect(refused).toEqual([
      expect.objectContaining({ code: "unsupported-combination" }),
    ]);
    expect(Object.isFrozen(refused)).toBe(true);
    // The declaration's refusal answers alone: the source is not asked.
    expect(
      provider.refusals({
        slice: { ...search, sort: [{ field: "name", direction: "asc" }] },
        window: DEFAULT_WINDOW,
      }),
    ).toEqual([expect.objectContaining({ code: "undeclared-field" })]);
    expect(provider.setSearch("yak")).toEqual([
      expect.objectContaining({ code: "unsupported-combination" }),
    ]);
    expect(provider.state.get().slice.search).toBeNull();
  });

  it("throws on a command the grammar rejects", () => {
    const { provider } = machineProvider();
    expect(() => provider.navigateWindow({ page: 0 })).toThrow(
      "page must be a positive integer",
    );
    expect(() => provider.navigateWindow({ size: -1 })).toThrow(
      "size must be a positive integer",
    );
  });
});

describe("createDataViewsProvider host", () => {
  it("adopts an external query and names the request", () => {
    const { provider, host } = machineProvider();
    const adopted: Slice = {
      ...EMPTY_SLICE,
      filter: [STATUS_FAILED],
      search: "yak",
    };
    const requestId = host.adopt({ slice: adopted, window: DEFAULT_WINDOW });
    expect(requestId).not.toBeNull();
    expect(provider.state.get().pendingRequestId).toBe(requestId);
    expect(provider.state.get().slice.filter).toEqual([STATUS_FAILED]);
    expect(provider.state.get().slice.search).toBe("yak");
    expect(provider.state.get().result.status).toBe("pending");
  });

  it("adopts an identical query without notifying", () => {
    const { provider, host } = machineProvider();
    let notifications = 0;
    provider.state.subscribe(() => {
      notifications += 1;
    });
    expect(
      host.adopt({ slice: EMPTY_SLICE, window: DEFAULT_WINDOW }),
    ).toBeNull();
    expect(notifications).toBe(0);
  });

  it("edits the filter through predicate commands", () => {
    const { provider, host } = machineProvider();
    expect(host.setPredicate(STATUS_FAILED)).toEqual([]);
    expect(provider.state.get().slice.filter).toEqual([STATUS_FAILED]);
    expect(
      host.setPredicate({ field: "owner", operator: "isSet", operands: [] }),
    ).toEqual([expect.objectContaining({ code: "undeclared-field" })]);
    expect(provider.state.get().slice.filter).toEqual([STATUS_FAILED]);
    expect(host.removePredicate("status", "eq")).toEqual([]);
    expect(provider.state.get().slice.filter).toEqual([]);
  });

  it("completes the pending request and publishes the result", () => {
    const { provider, host } = machineProvider();
    const requestId = host.refresh();
    expect(host.complete(requestId, delivered([{ id: "m-1" }]))).toBe(true);
    const { result } = provider.state.get();
    expect(result.status).toBe("ready");
    expect(result.rows).toEqual([{ id: "m-1" }]);
    expect(result.counts).toEqual({
      pageable: { kind: "exact", value: 1 },
      matched: { kind: "exact", value: 1 },
      total: { kind: "exact", value: 1 },
    });
    expect(result.provenance?.requestId).toBe(requestId);
  });

  it("ignores completions of requests it never issued", () => {
    const { provider, host } = machineProvider();
    let notifications = 0;
    provider.state.subscribe(() => {
      notifications += 1;
    });
    expect(host.complete("i999:r9", delivered([{ id: "ghost" }]))).toBe(false);
    expect(notifications).toBe(0);
    expect(provider.state.get().result.status).toBe("idle");
    expect(provider.rows.get().ids).toEqual([]);
  });

  it("builds nothing for a delivery of a request already settled", () => {
    const identify = vi.fn((row: Machine) => row.id);
    const { source } = createManualSource<Machine>({
      capabilities: permissive,
    });
    const provider = createDataViewsProvider({
      collection: machineCollection(identify),
      source,
    });
    const host = readProviderHost(provider);
    const settled = host.refresh();
    host.complete(settled, delivered([{ id: "m-1" }]));
    identify.mockClear();
    let notifications = 0;
    provider.state.subscribe(() => {
      notifications += 1;
    });
    expect(host.complete(settled, delivered([{ id: "m-2" }]))).toBe(false);
    expect(identify).not.toHaveBeenCalled();
    expect(notifications).toBe(0);
    expect(provider.rows.get().ids).toEqual(["m-1"]);
  });
});

describe("createDataViewsProvider rows", () => {
  it("publishes the shared row model when a request succeeds", () => {
    const { provider, host } = machineProvider();
    host.complete(host.refresh(), delivered([{ id: "m-1" }, { id: "m-2" }]));
    expect(provider.rows.get().ids).toEqual(["m-1", "m-2"]);
    expect(provider.rows.get().byId("m-2")).toEqual({ id: "m-2" });
  });

  it("carries the model across a republication of the same records", () => {
    const { provider, host } = machineProvider();
    const rows = [{ id: "m-1" }];
    host.complete(host.refresh(), delivered(rows));
    const first = provider.rows.get();
    host.complete(host.refresh(), delivered([...rows]));
    expect(provider.rows.get()).toBe(first);
  });

  it("fails the whole completion when a record has no usable identity", () => {
    const { provider, host } = machineProvider();
    expect(
      host.complete(host.refresh(), delivered([{ id: "" }, { id: "m-1" }])),
    ).toBe(true);
    expect(provider.rows.get().ids).toEqual([]);
    const { result } = provider.state.get();
    expect(result.status).toBe("failed");
    expect(result.problem).toMatchObject({
      status: "failed",
      failure: {
        reason: "row identity must be a non-empty string",
        transient: false,
        cause: null,
      },
    });
  });

  it("fails a completion whose records claim one identity", () => {
    const { provider, host } = machineProvider();
    host.complete(host.refresh(), delivered([{ id: "m-1" }]));
    const retained = provider.rows.get();
    host.complete(host.refresh(), delivered([{ id: "m-2" }, { id: "m-2" }]));
    // The rows still answer the query, so they are kept and the refresh is
    // reported as failed over them — never replaced by rows nothing can key.
    expect(provider.rows.get()).toBe(retained);
    expect(provider.state.get().result.status).toBe("refresh-failed");
    expect(provider.state.get().result.problem).toMatchObject({
      status: "failed",
      failure: { reason: 'duplicate row id "m-2"' },
    });
  });

  it("identifies records through the collection's identity", () => {
    type Keyed = { readonly uuid: string };
    const keyed = createCollection({
      fields: [{ field: "name", kind: "text" }],
      identify: (row: Keyed) => row.uuid,
    });
    const { source } = createManualSource<Keyed>();
    const provider = createDataViewsProvider({ collection: keyed, source });
    const host = readProviderHost(provider);
    host.complete(host.refresh(), delivered([{ uuid: "a" }]));
    expect(provider.rows.get().ids).toEqual(["a"]);
  });

  it("retains the row model when a request fails or is refused", () => {
    const { provider, host } = machineProvider();
    host.complete(host.refresh(), delivered([{ id: "m-1" }]));
    const retained = provider.rows.get();
    host.complete(host.refresh(), FAILED);
    expect(provider.rows.get()).toBe(retained);
    expect(provider.state.get().result.status).toBe("refresh-failed");
    expect(provider.state.get().result.problem).toEqual(FAILED);
    host.complete(host.refresh(), REFUSED);
    expect(provider.rows.get()).toBe(retained);
    expect(provider.state.get().result.problem).toEqual(REFUSED);
  });

  it("discards the row model of a superseded request", () => {
    const { provider, host } = machineProvider();
    const stale = host.refresh();
    provider.setSearch("failed");
    expect(host.complete(stale, delivered([{ id: "m-1" }]))).toBe(false);
    expect(provider.rows.get().ids).toEqual([]);
  });
});

describe("createDataViewsProvider reset", () => {
  it("returns to the seed and asks for the new generation's first page", () => {
    const { source, calls, callAt } = createManualSource<Machine>({
      capabilities: permissive,
    });
    const provider = createDataViewsProvider({
      collection: machines,
      source,
      seed: {
        slice: { ...EMPTY_SLICE, search: "yak" },
        window: DEFAULT_WINDOW,
      },
    });
    const release = provider.observe();
    expect(callAt(0).request.slice.search).toBe("yak");
    callAt(0).deliver(delivered([{ id: "m-1" }]));
    provider.selection.set(["m-1"]);
    provider.setSearch("zebra");
    provider.navigateWindow({ page: 3 });
    const stale = callAt(2);
    const generation = provider.state.get().generation;

    provider.reset();

    const reset = provider.state.get();
    expect(reset.generation).toBe(generation + 1);
    expect(reset.slice.search).toBe("yak");
    expect(reset.window).toEqual(DEFAULT_WINDOW);
    expect(provider.rows.get().ids).toEqual([]);
    expect(provider.selection.state.get().ids.size).toBe(0);
    // Observed, so the new generation's first page is requested at once.
    expect(calls).toHaveLength(4);
    expect(callAt(3).request.slice.search).toBe("yak");
    expect(callAt(3).request.requestId).toBe(reset.pendingRequestId);
    expect(callAt(3).request.requestId).not.toBe(stale.request.requestId);
    expect(stale.releases).toBe(1);

    // The old generation's delivery publishes nothing into the new one.
    stale.deliver(delivered([{ id: "ghost" }]));
    expect(provider.state.get()).toBe(reset);
    expect(provider.rows.get().ids).toEqual([]);

    callAt(3).deliver(delivered([{ id: "m-2" }]));
    expect(provider.rows.get().ids).toEqual(["m-2"]);
    expect(provider.state.get().result.status).toBe("ready");
    release();
  });

  it("waits for the first observer when reset while unobserved", () => {
    const { provider, host, calls, callAt } = machineProvider();
    host.complete(host.refresh(), delivered([{ id: "m-1" }]));
    provider.reset();
    expect(calls).toHaveLength(0);
    expect(provider.state.get().result.status).toBe("idle");
    expect(provider.state.get().pendingRequestId).toBeNull();
    expect(provider.rows.get().ids).toEqual([]);
    const release = provider.observe();
    expect(calls).toHaveLength(1);
    expect(callAt(0).request.requestId).toBe(
      provider.state.get().pendingRequestId,
    );
    release();
  });
});

describe("createDataViewsProvider runAction", () => {
  const acting = declareCapabilities(machines, {
    actions: { stop: { targets: "explicit", limit: 2 } },
  });

  /** A runner failing `m-2` and succeeding every other explicit target. */
  const runner: SourceActionRunner = async (request) =>
    request.targets.kind === "explicit"
      ? request.targets.ids.map((target) =>
          target === "m-2"
            ? { target, status: "failed" as const, reason: "busy" }
            : { target, status: "succeeded" as const },
        )
      : [];

  const actingProvider = (runAction: SourceActionRunner = runner) => {
    const spy = vi.fn(runAction);
    const { source } = createManualSource<Machine>({
      capabilities: acting,
      runAction: spy,
    });
    const provider = createDataViewsProvider({ collection: machines, source });
    return { provider, runAction: spy };
  };

  it("runs over the selection and keeps only the failures selected", async () => {
    const { provider, runAction } = actingProvider();
    provider.selection.set(["m-1", "m-2"]);
    const run = await provider.runAction({ action: "stop" });
    expect(runAction).toHaveBeenCalledWith({
      action: "stop",
      targets: { kind: "explicit", ids: ["m-1", "m-2"] },
      payload: undefined,
    });
    // Settled: every target has an outcome, and one failure fails the run.
    expect(run).toMatchObject({
      status: "failed",
      targets: ["m-1", "m-2"],
      succeeded: ["m-1"],
      failed: [{ target: "m-2", reason: "busy" }],
    });
    expect([...provider.selection.state.get().ids]).toEqual(["m-2"]);
  });

  it("captures the targets when the run begins, whatever the selection does after", async () => {
    let settle: ((outcomes: readonly ActionOutcome[]) => void) | null = null;
    const runner: SourceActionRunner = () =>
      new Promise((resolve) => {
        settle = resolve;
      });
    const { source } = createManualSource<Machine>({
      capabilities: acting,
      runAction: runner,
    });
    const provider = createDataViewsProvider({ collection: machines, source });
    provider.selection.set(["m-1"]);
    const pending = provider.runAction({ action: "stop" });
    provider.selection.add(["m-2"]);
    if (settle === null) {
      throw new Error("the runner was not called");
    }
    (settle as (outcomes: readonly ActionOutcome[]) => void)([
      { target: "m-1", status: "succeeded" },
    ]);
    const run = await pending;
    expect(run.targets).toEqual(["m-1"]);
    expect([...provider.selection.state.get().ids]).toEqual(["m-2"]);
  });

  it("takes explicit targets over the selection, with the payload", async () => {
    const { provider, runAction } = actingProvider();
    provider.selection.set(["m-1"]);
    const run = await provider.runAction({
      action: "stop",
      targets: ["m-3"],
      payload: { force: true },
    });
    expect(runAction).toHaveBeenCalledWith({
      action: "stop",
      targets: { kind: "explicit", ids: ["m-3"] },
      payload: { force: true },
    });
    expect(run.status).toBe("succeeded");
    expect(run.targets).toEqual(["m-3"]);
    expect([...provider.selection.state.get().ids]).toEqual(["m-1"]);
  });

  it("rejects an undeclared action, no targets and too many targets", async () => {
    const { provider, runAction } = actingProvider();
    await expect(
      provider.runAction({ action: "delete", targets: ["m-1"] }),
    ).rejects.toThrow('this source declares no "delete" action');
    await expect(provider.runAction({ action: "stop" })).rejects.toThrow(
      '"stop" addresses no record',
    );
    await expect(
      provider.runAction({ action: "stop", targets: ["a", "b", "c"] }),
    ).rejects.toThrow('"stop" addresses at most 2 records at a time');
    expect(runAction).not.toHaveBeenCalled();
    const { provider: inert } = machineProvider();
    await expect(
      inert.runAction({ action: "stop", targets: ["m-1"] }),
    ).rejects.toThrow("this source runs no actions");
  });

  it("fails every target when the runner throws", async () => {
    const { provider } = actingProvider(async () => {
      throw new Error("gateway down");
    });
    provider.selection.set(["m-1", "m-2"]);
    const run = await provider.runAction({ action: "stop" });
    expect(run.status).toBe("failed");
    expect(run.failed).toEqual([
      { target: "m-1", reason: "gateway down" },
      { target: "m-2", reason: "gateway down" },
    ]);
    expect(provider.selection.state.get().ids.size).toBe(2);
  });

  it("fails a target the source reports no outcome for", async () => {
    const { provider } = actingProvider(async () => [
      { target: "m-1", status: "succeeded" },
    ]);
    const run = await provider.runAction({
      action: "stop",
      targets: ["m-1", "m-4"],
    });
    expect(run.status).toBe("failed");
    expect(run.succeeded).toEqual(["m-1"]);
    expect(run.failed).toEqual([
      { target: "m-4", reason: "the source reported no outcome" },
    ]);
    expect(Object.keys(run).sort()).toEqual([
      "failed",
      "status",
      "succeeded",
      "targets",
    ]);
  });
});

describe("createDataViewsProvider record types", () => {
  type Container = { readonly id: string; readonly type: "container" };
  type VirtualMachine = {
    readonly id: string;
    readonly type: "virtual-machine";
    readonly secureboot?: string;
  };
  type Instance = Container | VirtualMachine;

  const instances = createCollection({
    fields: [
      {
        field: "type",
        kind: "choices",
        options: ["container", "virtual-machine"],
      },
      {
        field: "secureboot",
        kind: "choices",
        options: ["true", "false"],
        appliesTo: ["virtual-machine"],
      },
    ],
    identify: (row: Instance) => row.id,
    discriminator: "type",
  });

  const instanceProvider = () => {
    const { source } = createManualSource<Instance>();
    const provider = createDataViewsProvider({ collection: instances, source });
    return { provider, host: readProviderHost(provider) };
  };

  const container = (id: string): Container => ({ id, type: "container" });
  const machine = (id: string): VirtualMachine => ({
    id,
    type: "virtual-machine",
  });

  it("reads the declared types off the collection, and null without them", () => {
    const { provider } = instanceProvider();
    expect(provider.collection.types).toEqual({
      field: "type",
      names: ["container", "virtual-machine"],
    });
    expect(machineProvider().provider.collection.types).toBeNull();
  });

  it("answers whether a field applies to a row", () => {
    const { host } = instanceProvider();
    expect(host.applicability("secureboot", machine("v-1"))).toBe("applies");
    expect(host.applicability("secureboot", container("c-1"))).toBe(
      "not-applicable",
    );
    expect(host.applicability("type", container("c-1"))).toBe("applies");
  });

  it("fails a completion carrying a row of an undeclared type", () => {
    const { provider, host } = instanceProvider();
    host.complete(host.refresh(), delivered([machine("v-1")]));
    const retained = provider.rows.get();
    const rogue = { id: "x-1", type: "sandbox" } as unknown as Instance;
    expect(host.complete(host.refresh(), delivered([rogue]))).toBe(true);
    // Never displayed: the rows already on screen stay, and the refresh is
    // reported as failed over them.
    expect(provider.rows.get()).toBe(retained);
    expect(provider.state.get().result.status).toBe("refresh-failed");
    expect(provider.state.get().result.problem).toMatchObject({
      status: "failed",
      failure: {
        reason: 'record type "sandbox" of row "x-1" is not declared',
        transient: false,
      },
    });
  });

  it("reads no row for a type when the same records come back", () => {
    let reads = 0;
    const counted = new Proxy(
      { id: "v-1", type: "virtual-machine" },
      {
        get(target, key) {
          if (key === "type") {
            reads += 1;
          }
          return Reflect.get(target, key);
        },
      },
    ) as Instance;
    const { host } = instanceProvider();
    host.complete(host.refresh(), delivered([counted]));
    const checked = reads;
    expect(checked).toBeGreaterThan(0);
    host.complete(host.refresh(), delivered([counted]));
    // The model came back whole, so its rows were checked once and are not
    // read again: they were already accepted and have not changed since.
    expect(reads).toBe(checked);
  });

  it("remembers the type of a record selected on an earlier page", () => {
    const { provider, host } = instanceProvider();
    host.complete(
      host.refresh(),
      delivered([machine("v-1"), container("c-1")]),
    );
    provider.selection.set(["v-1", "c-1"]);
    host.complete(host.refresh(), delivered([machine("v-2")]));
    expect(provider.rows.get().byId("v-1")).toBeUndefined();
    expect(host.recordType("v-1")).toBe("virtual-machine");
    expect(host.recordType("c-1")).toBe("container");
  });

  it("knows no type for a selection restored over rows it never saw", () => {
    const { provider, host } = instanceProvider();
    provider.selection.set(["unseen"]);
    expect(host.recordType("unseen")).toBeNull();
  });

  it("forgets every remembered type on reset", () => {
    const { provider, host } = instanceProvider();
    host.complete(host.refresh(), delivered([machine("v-1")]));
    provider.selection.set(["v-1"]);
    host.complete(host.refresh(), delivered([]));
    expect(host.recordType("v-1")).toBe("virtual-machine");
    provider.reset();
    provider.selection.set(["v-1"]);
    expect(host.recordType("v-1")).toBeNull();
  });
});

describe("createDataViewsProvider monomorphic collection", () => {
  // Nothing in the record-type work reaches a collection that declares no
  // discriminator: no row is read for a type, no memory is kept, and every
  // field applies to every row.
  it("declares no types, remembers nothing and applies every field", () => {
    const { provider, host } = machineProvider();
    expect(provider.collection.types).toBeNull();
    host.complete(host.refresh(), delivered([{ id: "m-1" }]));
    provider.selection.set(["m-1"]);
    expect(host.recordType("m-1")).toBeNull();
    expect(host.applicability("status", { id: "m-1" })).toBe("applies");
    expect(host.applicability("anything", { id: "m-1" })).toBe("applies");
  });

  it("leaves a scoped field applying to every row", () => {
    const scoped = createCollection({
      fields: [
        { field: "type", kind: "choices", options: ["container"] },
        { field: "secureboot", kind: "flag", appliesTo: ["container"] },
      ],
      identify: (row: Machine) => row.id,
    });
    const { source } = createManualSource<Machine>();
    const provider = createDataViewsProvider({ collection: scoped, source });
    // No discriminator: there is one record type, so a field scoped to it
    // has nothing to exclude and the scoping never fires.
    expect(scoped.types).toBeNull();
    expect(
      readProviderHost(provider).applicability("secureboot", { id: "m-1" }),
    ).toBe("applies");
  });

  it("never reads a row for a type", () => {
    // The discriminator is the only reason a provider reads a row for
    // anything but its identity. A record that answers to no read at all
    // still completes, so nothing here touches it.
    const { provider, host } = machineProvider();
    const record = new Proxy(
      // The record carries a key that looks like a discriminator, so a
      // provider that read one would reach the trap rather than an absent
      // key, which no read of any kind can be told from.
      { id: "m-1", type: "container" },
      {
        get(target, key) {
          if (key !== "id") {
            throw new Error(`read of ${String(key)} on a monomorphic row`);
          }
          return Reflect.get(target, key);
        },
      },
    );
    expect(host.complete(host.refresh(), delivered([record]))).toBe(true);
    expect(provider.state.get().result.status).toBe("ready");
    provider.selection.set(["m-1"]);
    expect(host.recordType("m-1")).toBeNull();
  });
});
