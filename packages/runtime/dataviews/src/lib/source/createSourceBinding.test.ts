import { describe, expect, it, vi } from "vitest";
import type {
  CollectionCoordinatorState,
  CompletionResult,
} from "../collection/createCollectionCoordinator.js";
import createCollectionCoordinator from "../collection/createCollectionCoordinator.js";
import createChannel, { type Channel } from "../observable/createChannel.js";
import createOperation from "../operation/createOperation.js";
import createDataViewsProvider from "../provider/createDataViewsProvider.js";
import type { Slice } from "../query/types.js";
import createSchema from "../schema/createSchema.js";
import createSelection from "../selection/createSelection.js";
import createArraySource from "./createArraySource.js";
import createSourceBinding, { type SourceHost } from "./createSourceBinding.js";
import type {
  SourceActionRunner,
  SourceAdapter,
  SourceCapabilities,
  SourceRequest,
} from "./types.js";

const schema = createSchema([
  { field: "status", kind: "choices", options: ["failed", "ready"] },
  { field: "cpu", kind: "number" },
]);

const provider = () => createDataViewsProvider({ schema });

/** Everything the fixture query needs, and a filtered count. */
const permissive: SourceCapabilities = {
  filter: { status: ["eq"], cpu: ["gte", "lte"] },
  search: ["name"],
  sort: ["cpu"],
  sortTerms: 2,
  group: [],
  count: "filtered",
};

type ManualCall = {
  readonly request: SourceRequest;
  readonly deliver: (result: CompletionResult) => void;
  releases: number;
};

/** An adapter whose deliveries the test drives by hand. */
const manual = (capabilities: SourceCapabilities = permissive) => {
  const calls: ManualCall[] = [];
  const adapter: SourceAdapter = {
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
  return { calls, adapter, callAt };
};

const rows = [
  { id: "a", name: "Alpha", cpu: 4 },
  { id: "b", name: "beta", cpu: 12 },
  { id: "c", name: "Gamma", cpu: 8 },
];

const local = () =>
  createArraySource({
    rows,
    fields: ["id", "name", "cpu", "status"],
    searchFields: ["name"],
  });

const idsOf = (state: CollectionCoordinatorState) =>
  (state.result.rows ?? []).map((row) => (row as { id: string }).id);

/**
 * A host over a real coordinator that counts its channel subscribers and
 * can issue a request without publishing it — the one way a delivery can
 * arrive for a settled request while a newer one is already in flight.
 */
const structuralHost = () => {
  const coordinator = createCollectionCoordinator();
  const channel = createChannel<CollectionCoordinatorState>(coordinator.state, {
    equals: (a, b) => a === b,
  });
  let subscribers = 0;
  let silent = false;
  const counting: Channel<CollectionCoordinatorState> = {
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
    result: counting,
    selection: createSelection(),
    refresh() {
      const requestId = coordinator.refresh();
      publish();
      return requestId;
    },
    complete(requestId, result) {
      const published = coordinator.complete(requestId, result);
      publish();
      return published;
    },
    invokeAction: (targets, payload) =>
      createOperation({ targets, payload, selectionRevision: 0 }),
  };
  return {
    host,
    coordinator,
    subscribers: () => subscribers,
    issueSilently(): string | null {
      silent = true;
      const requestId = coordinator.refresh();
      silent = false;
      return requestId;
    },
  };
};

describe("createSourceBinding", () => {
  it("binds a host told its adapter's own declaration, however spelled", () => {
    const adapter = manual({
      ...permissive,
      // A field declared with no operator list is a field not declared.
      filter: { ...permissive.filter, owner: undefined },
      search: ["name", "owner"],
      sort: ["cpu", "status"],
      group: ["status", "cpu"],
    }).adapter;
    const told = createDataViewsProvider({
      schema,
      capabilities: {
        ...permissive,
        // Every list is a set: order and repetition say nothing.
        filter: { cpu: ["lte", "gte", "gte"], status: ["eq"], zone: [] },
        search: ["owner", "name", "name"],
        sort: ["status", "cpu", "cpu"],
        group: ["cpu", "status", "status"],
      },
    });
    expect(() => createSourceBinding({ host: told, adapter })).not.toThrow();
  });

  it.each([
    ["operator set (narrower)", { filter: { status: ["eq"], cpu: ["gte"] } }],
    [
      "operator set (substituted)",
      { filter: { status: ["eq"], cpu: ["gte", "eq"] } },
    ],
    ["search field", { search: ["name", "owner"] }],
    ["sortable field", { sort: ["cpu", "status"] }],
    ["sort-term limit", { sortTerms: 3 }],
    ["groupable field", { group: ["status"] }],
    ["count", { count: "none" }],
  ] as const)("refuses a host told a different %s", (_part, difference) => {
    const told = createDataViewsProvider({
      schema,
      capabilities: { ...permissive, ...difference },
    });
    expect(() =>
      createSourceBinding({ host: told, adapter: manual().adapter }),
    ).toThrow(
      "the host was told different capabilities from those its source adapter declares",
    );
  });

  it("re-exposes what the source declares", () => {
    const binding = createSourceBinding({
      host: provider(),
      adapter: manual().adapter,
    });
    expect(binding.capabilities).toBe(permissive);
    expect(
      binding.supports({
        filter: [],
        search: null,
        sort: [{ field: "cpu", direction: "asc" }],
        group: null,
      }),
    ).toEqual({ status: "supported" });
    expect(
      binding.supports({
        filter: [],
        search: null,
        sort: [{ field: "zone", direction: "asc" }],
        group: null,
      }),
    ).toEqual({
      status: "unsupported",
      refusals: [
        {
          part: "sort",
          field: "zone",
          operator: null,
          reason: 'field "zone" cannot be sorted',
        },
      ],
    });
    binding.dispose();
  });

  it("executes a request already outstanding when it attaches", () => {
    const host = provider();
    const requestId = host.refresh();
    const source = manual();
    const binding = createSourceBinding({ host, adapter: source.adapter });
    expect(source.calls).toHaveLength(1);
    expect(source.callAt(0).request.requestId).toBe(requestId);
    binding.dispose();
  });

  it("executes nothing when it attaches to a settled host", () => {
    const host = provider();
    const requestId = host.refresh();
    if (requestId === null) {
      throw new Error("expected a refresh request");
    }
    host.complete(requestId, { status: "success", rows, count: 3 });
    const source = manual();
    const binding = createSourceBinding({ host, adapter: source.adapter });
    expect(source.calls).toHaveLength(0);
    expect(host.result.get().result.provenance).toEqual({ requestId });
    expect(host.result.get().resultsMatchCurrentQuery).toBe(true);
    binding.dispose();
  });

  it("executes nothing when it attaches to a disposed host", () => {
    const host = provider();
    host.refresh();
    host.dispose();
    const source = manual();
    const binding = createSourceBinding({ host, adapter: source.adapter });
    expect(source.calls).toHaveLength(0);
    binding.dispose();
  });

  it("executes each newly issued request and publishes its completion", () => {
    const host = provider();
    const source = manual();
    const binding = createSourceBinding({ host, adapter: source.adapter });
    expect(source.calls).toHaveLength(0);

    const requestId = host.refresh();
    expect(source.callAt(0).request).toEqual({
      requestId,
      slice: host.result.get().slice,
      window: { page: 1, size: 50 },
    });
    source.callAt(0).deliver({ status: "success", rows, count: 3 });
    expect(host.result.get().result).toEqual({
      status: "ready",
      rows,
      count: 3,
      provenance: { requestId },
      lastError: null,
    });
    expect(host.result.get().resultsMatchCurrentQuery).toBe(true);
    binding.dispose();
  });

  it("carries the request's whole query and window to the source", () => {
    const host = provider();
    const source = manual();
    const binding = createSourceBinding({ host, adapter: source.adapter });
    host.fields.status.eq.set(["failed"]);
    host.setSearch("web");
    host.navigateWindow(2, 10);
    const last = source.callAt(source.calls.length - 1).request;
    expect(last.slice).toEqual({
      filter: [{ field: "status", operator: "eq", operands: ["failed"] }],
      search: "web",
      sort: [],
      group: null,
    });
    expect(last.window).toEqual({ page: 2, size: 10 });
    binding.dispose();
  });

  it("filters through the default source end to end", () => {
    const host = provider();
    const binding = createSourceBinding({ host, adapter: local() });
    host.refresh();
    expect(idsOf(host.result.get())).toEqual(["a", "b", "c"]);
    host.fields.cpu.gte.set([8]);
    expect(idsOf(host.result.get())).toEqual(["b", "c"]);
    expect(host.result.get().result.count).toBe(2);
    binding.dispose();
  });

  it("releases the previous request when a new one supersedes it", () => {
    const host = provider();
    const source = manual();
    const binding = createSourceBinding({ host, adapter: source.adapter });
    host.refresh();
    host.setSearch("web");
    expect(source.calls).toHaveLength(2);
    expect(source.callAt(0).releases).toBe(1);
    expect(source.callAt(1).releases).toBe(0);
    binding.dispose();
  });

  it("drops the completion of a superseded in-flight request", () => {
    const host = provider();
    const source = manual();
    const binding = createSourceBinding({ host, adapter: source.adapter });
    host.refresh();
    host.setSearch("web");
    const pending = host.result.get().pendingRequestId;

    source.callAt(0).deliver({ status: "success", rows, count: 3 });
    expect(host.result.get().result.rows).toBeNull();
    expect(host.result.get().result.status).toBe("pending");
    expect(host.result.get().pendingRequestId).toBe(pending);

    source.callAt(1).deliver({ status: "success", rows: [rows[0]], count: 1 });
    expect(idsOf(host.result.get())).toEqual(["a"]);
    binding.dispose();
  });

  it("drops a delivery that arrives after release", () => {
    const host = provider();
    const source = manual();
    const binding = createSourceBinding({ host, adapter: source.adapter });
    const requestId = host.refresh();
    expect(source.calls).toHaveLength(1);

    binding.dispose();
    expect(source.callAt(0).releases).toBe(1);
    source.callAt(0).deliver({ status: "success", rows, count: 3 });
    expect(host.result.get().result.rows).toBeNull();
    expect(host.result.get().result.status).toBe("refreshing");
    expect(host.result.get().pendingRequestId).toBe(requestId);
  });

  it("releases once however often it is disposed", () => {
    const structural = structuralHost();
    const source = manual();
    const binding = createSourceBinding({
      host: structural.host,
      adapter: source.adapter,
    });
    structural.host.refresh();
    expect(structural.subscribers()).toBe(1);

    binding.dispose();
    binding.dispose();
    expect(source.callAt(0).releases).toBe(1);
    expect(structural.subscribers()).toBe(0);
  });

  it("publishes a failure with the retained rows and the reason", () => {
    const host = provider();
    const source = manual();
    const binding = createSourceBinding({ host, adapter: source.adapter });
    host.refresh();
    source.callAt(0).deliver({ status: "success", rows, count: 3 });
    host.setSearch("web");
    source.callAt(1).deliver({ status: "failure", reason: "503 from ex:api" });
    expect(host.result.get().result).toEqual({
      status: "stale",
      rows,
      count: 3,
      provenance: { requestId: source.callAt(0).request.requestId },
      lastError: "503 from ex:api",
    });
    expect(host.result.get().resultsMatchCurrentQuery).toBe(false);
    binding.dispose();
  });

  it("publishes a failure when the source cannot even start", () => {
    const host = provider();
    const binding = createSourceBinding({
      host,
      adapter: {
        capabilities: permissive,
        execute() {
          throw new Error("no client configured");
        },
      },
    });
    host.refresh();
    expect(host.result.get().result).toMatchObject({
      status: "error",
      lastError: "no client configured",
    });
    expect(host.result.get().pendingRequestId).toBeNull();
    binding.dispose();
  });

  it("treats a field declared with no operator list as unfilterable", () => {
    const host = provider();
    const source = manual({
      ...permissive,
      // Legal per the declaration type, and it must not read as "any operator".
      filter: { status: ["eq"], cpu: undefined },
    });
    const binding = createSourceBinding({ host, adapter: source.adapter });
    host.fields.cpu.gte.set([1]);
    expect(host.result.get().result).toMatchObject({ status: "error" });
    expect(host.result.get().result.lastError).toContain("cpu");
    binding.dispose();
  });

  it("leaves a newer execution alone when an older start throws", () => {
    const host = provider();
    let calls = 0;
    const binding = createSourceBinding({
      host,
      adapter: {
        capabilities: permissive,
        execute(_request, deliver) {
          calls += 1;
          if (calls === 1) {
            // Settle this request and move the query on, so a second
            // execution is already running when this call fails.
            deliver({ status: "success", rows: [], count: 0 });
            host.setSearch("moved");
            throw new Error("late failure");
          }
          return () => {};
        },
      },
    });
    host.refresh();
    expect(calls).toBe(2);
    // The superseded request's failure must not publish over the request
    // that replaced it.
    expect(host.result.get().result.lastError).not.toBe("late failure");
    binding.dispose();
  });

  it("refuses an unsupported query without calling the source", () => {
    const host = provider();
    const source = manual({ ...permissive, sortTerms: 0, search: [] });
    const binding = createSourceBinding({ host, adapter: source.adapter });
    host.setSort([{ field: "cpu", direction: "asc" }]);
    expect(source.calls).toHaveLength(0);
    expect(host.result.get().result).toMatchObject({
      status: "error",
      lastError: "this source cannot sort",
    });
    binding.dispose();
  });

  it("refuses an over-long ordering rather than truncating it", () => {
    const host = provider();
    const source = manual({ ...permissive, sortTerms: 1 });
    const binding = createSourceBinding({ host, adapter: source.adapter });
    host.setSort([
      { field: "cpu", direction: "asc" },
      { field: "cpu", direction: "desc" },
    ]);
    expect(source.calls).toHaveLength(0);
    expect(host.result.get().result.lastError).toBe(
      "this source executes at most 1 sort term",
    );
    binding.dispose();
  });

  it("refuses a grouped query rather than answering it ungrouped", () => {
    const host = provider();
    const binding = createSourceBinding({ host, adapter: local() });
    host.adopt(
      { filter: [], search: null, sort: [], group: "status" },
      { page: 1, size: 50 },
    );
    expect(host.result.get().result).toMatchObject({
      status: "error",
      rows: null,
      lastError: 'field "status" cannot be grouped',
    });
    binding.dispose();
  });

  it("executes an adopted query, as on back or forward navigation", () => {
    const host = provider();
    const source = manual();
    const binding = createSourceBinding({ host, adapter: source.adapter });
    const adopted: Slice = {
      filter: [],
      search: "web",
      sort: [{ field: "cpu", direction: "asc" }],
      group: null,
    };
    const requestId = host.adopt(adopted, { page: 3, size: 25 });
    expect(source.callAt(0).request).toEqual({
      requestId,
      slice: host.result.get().slice,
      window: { page: 3, size: 25 },
    });
    binding.dispose();
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
    const binding = createSourceBinding({
      host,
      adapter: createArraySource({ rows: fleet, fields: ["status"] }),
    });
    const observed = () => {
      const state = host.result.get();
      return {
        rows: state.result.rows?.length,
        status: state.result.status,
        matches: state.resultsMatchCurrentQuery,
        lastError: state.result.lastError,
      };
    };
    const refused = 'field "cpu" cannot be sorted';
    host.refresh();
    expect(observed()).toEqual({
      rows: 9,
      status: "ready",
      matches: true,
      lastError: null,
    });
    host.fields.status.eq.set(["failed"]);
    expect(observed()).toEqual({
      rows: 3,
      status: "ready",
      matches: true,
      lastError: null,
    });
    host.setSort([{ field: "cpu", direction: "asc" }]);
    expect(observed()).toEqual({
      rows: 3,
      status: "stale",
      matches: false,
      lastError: refused,
    });
    host.fields.status.eq.set(["ready"]);
    expect(observed()).toEqual({
      rows: 3,
      status: "stale",
      matches: false,
      lastError: refused,
    });
    // The query stays as asked: the refused term is shown, never dropped.
    expect(host.result.get().slice.sort).toEqual([
      { field: "cpu", direction: "asc" },
    ]);
    host.setSort([]);
    expect(observed()).toEqual({
      rows: 6,
      status: "ready",
      matches: true,
      lastError: null,
    });
    binding.dispose();
  });

  it("joins every refusal into the published reason", () => {
    const host = provider();
    const source = manual({ ...permissive, sortTerms: 0, search: [] });
    const binding = createSourceBinding({ host, adapter: source.adapter });
    host.adopt(
      {
        filter: [],
        search: "web",
        sort: [{ field: "cpu", direction: "asc" }],
        group: null,
      },
      { page: 1, size: 50 },
    );
    expect(host.result.get().result.lastError).toBe(
      "this source cannot search; this source cannot sort",
    );
    binding.dispose();
  });

  it("never publishes a count a source does not declare", () => {
    const host = provider();
    const source = manual({ ...permissive, count: "none" });
    const binding = createSourceBinding({ host, adapter: source.adapter });
    host.refresh();
    source.callAt(0).deliver({ status: "success", rows, count: 9000 });
    expect(host.result.get().result).toMatchObject({
      status: "ready",
      count: null,
    });
    expect(idsOf(host.result.get())).toEqual(["a", "b", "c"]);
    binding.dispose();
  });

  it("never publishes an undeclared count on an external change either", () => {
    const host = provider();
    const source = manual({ ...permissive, count: "none" });
    const binding = createSourceBinding({ host, adapter: source.adapter });
    host.refresh();
    source.callAt(0).deliver({ status: "success", rows, count: 9000 });
    source.callAt(0).deliver({ status: "success", rows: [rows[0]], count: 1 });
    expect(host.result.get().result).toMatchObject({
      status: "ready",
      count: null,
    });
    expect(idsOf(host.result.get())).toEqual(["a"]);
    binding.dispose();
  });

  it("leaves a failure reason alone on a source that declares no count", () => {
    const host = provider();
    const source = manual({ ...permissive, count: "none" });
    const binding = createSourceBinding({ host, adapter: source.adapter });
    host.refresh();
    source.callAt(0).deliver({ status: "failure", reason: "no route" });
    expect(host.result.get().result.lastError).toBe("no route");
    binding.dispose();
  });

  it("releases the live request when the scope rotates", () => {
    const host = provider();
    const source = manual();
    const binding = createSourceBinding({ host, adapter: source.adapter });
    host.refresh();
    host.rotateScope();
    expect(source.callAt(0).releases).toBe(1);
    expect(host.result.get().result.status).toBe("idle");

    // The pre-rotation execution can no longer publish into the new scope.
    source.callAt(0).deliver({ status: "success", rows, count: 3 });
    expect(host.result.get().result.status).toBe("idle");

    const requestId = host.refresh();
    expect(source.calls).toHaveLength(2);
    expect(source.callAt(1).request.requestId).toBe(requestId);
    source.callAt(1).deliver({ status: "success", rows: [rows[0]], count: 1 });
    expect(idsOf(host.result.get())).toEqual(["a"]);
    binding.dispose();
  });

  it("keeps republishing external changes after a scope rotation", () => {
    const host = provider();
    const source = local();
    const binding = createSourceBinding({ host, adapter: source });
    host.refresh();
    host.rotateScope();
    host.refresh();
    expect(idsOf(host.result.get())).toEqual(["a", "b", "c"]);

    source.setRows([{ id: "z", name: "Zed", cpu: 1 }]);
    expect(idsOf(host.result.get())).toEqual(["z"]);
    binding.dispose();
  });

  it("releases the live request when the host is disposed", () => {
    const structural = structuralHost();
    const source = manual();
    createSourceBinding({ host: structural.host, adapter: source.adapter });
    structural.host.refresh();
    structural.coordinator.dispose();
    structural.host.complete("unused", { status: "failure", reason: "x" });
    expect(source.callAt(0).releases).toBe(1);
    expect(structural.subscribers()).toBe(0);
  });

  it("stops observing the host once disposed", () => {
    const host = provider();
    const source = manual();
    const binding = createSourceBinding({ host, adapter: source.adapter });
    binding.dispose();
    host.refresh();
    expect(source.calls).toHaveLength(0);
  });

  it("executes a request delivered synchronously by its own source", () => {
    const host = provider();
    const requestId = host.refresh();
    const binding = createSourceBinding({ host, adapter: local() });
    expect(host.result.get().result).toMatchObject({
      status: "ready",
      count: 3,
      provenance: { requestId },
    });
    binding.dispose();
  });

  it("republishes an external change under a fresh request identity", () => {
    const host = provider();
    const source = local();
    const binding = createSourceBinding({ host, adapter: source });
    const first = host.refresh();
    expect(idsOf(host.result.get())).toEqual(["a", "b", "c"]);

    source.setRows([...rows, { id: "d", name: "delta", cpu: 1 }]);
    const state = host.result.get();
    expect(idsOf(state)).toEqual(["a", "b", "c", "d"]);
    expect(state.result.count).toBe(4);
    expect(state.result.provenance).not.toBeNull();
    expect(state.result.provenance?.requestId).not.toBe(first);
    expect(state.resultsMatchCurrentQuery).toBe(true);
    expect(state.pendingRequestId).toBeNull();
    binding.dispose();
  });

  it("republishes without re-executing a source that delivers on its own", () => {
    const host = provider();
    const source = manual();
    const binding = createSourceBinding({ host, adapter: source.adapter });
    const first = host.refresh();
    source.callAt(0).deliver({ status: "success", rows, count: 3 });

    source.callAt(0).deliver({ status: "success", rows: [rows[0]], count: 1 });
    expect(source.calls).toHaveLength(1);
    const state = host.result.get();
    expect(idsOf(state)).toEqual(["a"]);
    expect(state.result.count).toBe(1);
    expect(state.result.provenance).not.toBeNull();
    expect(state.result.provenance?.requestId).not.toBe(first);
    expect(state.resultsMatchCurrentQuery).toBe(true);
    binding.dispose();
  });

  it("converges on a request another listener issued while it republished", () => {
    const host = provider();
    const source = manual();
    const binding = createSourceBinding({ host, adapter: source.adapter });
    host.refresh();
    source.callAt(0).deliver({ status: "success", rows, count: 3 });

    let armed = true;
    host.result.subscribe(() => {
      if (armed && host.result.get().result.status === "refreshing") {
        armed = false;
        host.setSearch("web");
      }
    });
    source.callAt(0).deliver({ status: "success", rows: [rows[0]], count: 1 });

    const pending = host.result.get().pendingRequestId;
    expect(pending).not.toBeNull();
    expect(source.callAt(source.calls.length - 1).request.requestId).toBe(
      pending,
    );
    binding.dispose();
  });

  it("releases a request superseded during its own synchronous delivery", () => {
    const host = provider();
    const calls: { requestId: string; releases: number }[] = [];
    const eager: SourceAdapter = {
      capabilities: permissive,
      execute(request, deliver) {
        const call = { requestId: request.requestId, releases: 0 };
        calls.push(call);
        deliver({ status: "success", rows, count: 3 });
        return () => {
          call.releases += 1;
        };
      },
    };
    const binding = createSourceBinding({ host, adapter: eager });
    let armed = true;
    host.result.subscribe(() => {
      if (armed && host.result.get().result.status === "ready") {
        armed = false;
        host.setSearch("web");
      }
    });

    host.refresh();
    expect(calls).toHaveLength(2);
    expect(calls[0]?.releases).toBe(1);
    expect(calls[1]?.releases).toBe(0);
    expect(host.result.get().result.provenance?.requestId).toBe(
      calls[1]?.requestId,
    );
    binding.dispose();
  });

  it("drops an external change the binding is disposed mid-republish", () => {
    const host = provider();
    const source = local();
    const binding = createSourceBinding({ host, adapter: source });
    host.refresh();
    host.result.subscribe(() => {
      if (host.result.get().result.status === "refreshing") {
        binding.dispose();
      }
    });

    source.setRows([{ id: "z", name: "Zed", cpu: 1 }]);
    expect(idsOf(host.result.get())).toEqual(["a", "b", "c"]);
    expect(host.result.get().result.status).toBe("refreshing");
  });

  it("never republishes an external change into a request already in flight", () => {
    const structural = structuralHost();
    const source = manual();
    const binding = createSourceBinding({
      host: structural.host,
      adapter: source.adapter,
    });
    structural.host.refresh();
    source.callAt(0).deliver({ status: "success", rows, count: 3 });
    expect(structural.host.result.get().result.count).toBe(3);

    structural.issueSilently();
    source.callAt(0).deliver({ status: "success", rows: [], count: 0 });
    expect(structural.host.result.get().result.count).toBe(3);
    binding.dispose();
  });

  it("drops an external change once the host is disposed", () => {
    const host = provider();
    const source = local();
    const binding = createSourceBinding({ host, adapter: source });
    host.refresh();
    host.dispose();
    source.setRows([]);
    expect(idsOf(host.result.get())).toEqual(["a", "b", "c"]);
    binding.dispose();
  });
});

describe("createSourceBinding row operations", () => {
  const acting = (host: ReturnType<typeof provider>) => {
    const runAction = vi.fn<SourceActionRunner>();
    const binding = createSourceBinding({
      host,
      adapter: { ...manual().adapter, runAction },
    });
    return { runAction, binding };
  };

  it("records per-target outcomes and clears successes from selection", async () => {
    const host = provider();
    host.selection.set(["a", "b", "c"]);
    const { runAction, binding } = acting(host);
    runAction.mockResolvedValueOnce([
      { target: "a", status: "success" },
      { target: "b", status: "failure", reason: "locked by ex:bo" },
      { target: "c", status: "success" },
    ]);

    const operation = await binding.runAction("stop", ["a", "b", "c"], {
      force: true,
    });
    expect(operation.state).toEqual({
      targets: ["a", "b", "c"],
      payload: { force: true },
      selectionRevision: 1,
      status: "failure",
      succeeded: ["a", "c"],
      failed: [{ target: "b", reason: "locked by ex:bo" }],
      remaining: [],
      attempts: 1,
    });
    expect([...host.selection.state.ids]).toEqual(["b"]);
    binding.dispose();
  });

  it("passes the deduplicated captured targets to the source", async () => {
    const host = provider();
    const { runAction, binding } = acting(host);
    runAction.mockResolvedValueOnce([]);
    await binding.runAction("stop", ["a", "a", "b"]);
    expect(runAction).toHaveBeenCalledTimes(1);
    expect(runAction).toHaveBeenCalledWith({
      action: "stop",
      targets: ["a", "b"],
      payload: undefined,
    });
    binding.dispose();
  });

  it("fails a captured target the source reported nothing for", async () => {
    const host = provider();
    host.selection.set(["a", "b"]);
    const { runAction, binding } = acting(host);
    runAction.mockResolvedValueOnce([{ target: "a", status: "success" }]);

    const operation = await binding.runAction("stop", ["a", "b"]);
    expect(operation.state).toMatchObject({
      status: "failure",
      succeeded: ["a"],
      failed: [{ target: "b", reason: "the source reported no outcome" }],
      remaining: [],
    });
    expect([...host.selection.state.ids]).toEqual(["b"]);
    binding.dispose();
  });

  it("ignores outcomes for targets it never captured", async () => {
    const host = provider();
    const { runAction, binding } = acting(host);
    runAction.mockResolvedValueOnce([
      { target: "a", status: "success" },
      { target: "elsewhere", status: "success" },
    ]);
    const operation = await binding.runAction("stop", ["a"]);
    expect(operation.state.succeeded).toEqual(["a"]);
    binding.dispose();
  });

  it("records a rejected operation as a failure of every target", async () => {
    const host = provider();
    host.selection.set(["a", "b"]);
    const { runAction, binding } = acting(host);
    runAction.mockRejectedValueOnce(new Error("network down"));

    const operation = await binding.runAction("stop", ["a", "b"]);
    expect(operation.state).toMatchObject({
      status: "failure",
      succeeded: [],
      failed: [
        { target: "a", reason: "network down" },
        { target: "b", reason: "network down" },
      ],
    });
    expect([...host.selection.state.ids]).toEqual(["a", "b"]);
    binding.dispose();
  });

  it("describes a non-Error rejection by its string form", async () => {
    const host = provider();
    const { runAction, binding } = acting(host);
    runAction.mockRejectedValueOnce("gateway timeout");
    const operation = await binding.runAction("stop", ["a"]);
    expect(operation.state.failed).toEqual([
      { target: "a", reason: "gateway timeout" },
    ]);
    binding.dispose();
  });

  it("describes a rejection with no string form at all", async () => {
    const host = provider();
    const { runAction, binding } = acting(host);
    runAction.mockRejectedValueOnce(Object.create(null));
    const operation = await binding.runAction("stop", ["a"]);
    expect(operation.state.failed).toEqual([
      { target: "a", reason: "unknown error" },
    ]);
    binding.dispose();
  });

  it("describes a rejection carrying an empty message", async () => {
    const host = provider();
    const { runAction, binding } = acting(host);
    runAction.mockRejectedValueOnce(new Error());
    const operation = await binding.runAction("stop", ["a"]);
    expect(operation.state.failed).toEqual([{ target: "a", reason: "Error" }]);
    binding.dispose();
  });

  it("retries only the failed targets under the same identity", async () => {
    const host = provider();
    const { runAction, binding } = acting(host);
    runAction.mockResolvedValueOnce([
      { target: "a", status: "success" },
      { target: "b", status: "failure", reason: "locked" },
    ]);
    const operation = await binding.runAction("stop", ["a", "b"]);
    const { identity } = operation;
    operation.retry();
    expect(operation.identity).toBe(identity);
    expect(operation.state).toMatchObject({
      status: "pending",
      remaining: ["b"],
      attempts: 2,
    });
    binding.dispose();
  });

  it("refuses to act on a source that declares no row operations", async () => {
    const binding = createSourceBinding({
      host: provider(),
      adapter: manual().adapter,
    });
    await expect(binding.runAction("stop", ["a"])).rejects.toThrow(
      "this source declares no row operations",
    );
    binding.dispose();
  });
});
