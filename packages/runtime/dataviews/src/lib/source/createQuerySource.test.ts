import {
  QueryClient,
  QueryObserver as TanStackObserver,
} from "@tanstack/query-core";
import { describe, expect, it, vi } from "vitest";
import type { CompletionResult } from "../collection/createCollectionCoordinator.js";
import createDataViewsProvider from "../provider/createDataViewsProvider.js";
import type { Slice } from "../query/types.js";
import type { RowRecord } from "../rows/types.js";
import createSchema from "../schema/createSchema.js";
import createQuerySource, {
  type QueryObservation,
  type QueryObserver,
} from "./createQuerySource.js";
import createSourceBinding from "./createSourceBinding.js";
import type {
  SourceActionRunner,
  SourceCapabilities,
  SourcePage,
  SourceRequest,
} from "./types.js";

/**
 * The query-client adapter, exercised against the real `@tanstack/query-core`
 * client: its cache, its refetching and its external writes. The adapter
 * itself imports nothing from the library — the client reaches it through
 * the structural observer surface, which these tests prove the real
 * `QueryObserver` satisfies.
 */

const emptySlice: Slice = { filter: [], search: null, sort: [], group: null };

const request = (overrides: Partial<SourceRequest> = {}): SourceRequest => ({
  requestId: "i1:r1",
  slice: emptySlice,
  window: { page: 1, size: 50 },
  ...overrides,
});

/** A constrained REST endpoint: one sort term, filtered totals. */
const endpoint: SourceCapabilities = {
  filter: { status: ["eq"] },
  search: ["name"],
  sort: ["cpu"],
  sortTerms: 1,
  group: [],
  count: "filtered",
};

const page = (rows: readonly RowRecord[], count: number): SourcePage => ({
  rows,
  count,
});

const delivery = () => vi.fn<(result: CompletionResult) => void>();

const deliveredAt = (
  deliver: ReturnType<typeof delivery>,
  index: number,
): CompletionResult => {
  const call = deliver.mock.calls[index];
  if (call === undefined) {
    throw new Error(`expected a delivery at index ${index}`);
  }
  return call[0];
};

const client = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  });

const source = (
  queryClient: QueryClient,
  fetchPage: (request: SourceRequest) => Promise<SourcePage>,
  queryKey: readonly unknown[] = ["machines"],
) =>
  createQuerySource({
    capabilities: endpoint,
    queryKey,
    fetchPage,
    observe: (query) => new TanStackObserver(queryClient, query),
  });

/** The single cached query key, or a failure rather than an empty key. */
const soleQueryKey = (queryClient: QueryClient): readonly unknown[] => {
  const entries = queryClient.getQueryCache().getAll();
  const [entry] = entries;
  if (entries.length !== 1 || entry === undefined) {
    throw new Error(`expected exactly one cached query, got ${entries.length}`);
  }
  return entry.queryKey;
};

describe("createQuerySource over @tanstack/query-core", () => {
  it("delivers the fetched page and its filtered total", async () => {
    const deliver = delivery();
    const fetchPage = vi.fn().mockResolvedValue(page([{ id: "a" }], 42));
    source(client(), fetchPage).execute(request(), deliver);
    await vi.waitFor(() => expect(deliver).toHaveBeenCalled());
    expect(deliveredAt(deliver, 0)).toEqual({
      status: "success",
      rows: [{ id: "a" }],
      count: 42,
    });
  });

  it("delivers a rejected fetch as a failure carrying its message", async () => {
    const deliver = delivery();
    const fetchPage = vi.fn().mockRejectedValue(new Error("503 from ex:api"));
    source(client(), fetchPage).execute(request(), deliver);
    await vi.waitFor(() => expect(deliver).toHaveBeenCalled());
    expect(deliveredAt(deliver, 0)).toEqual({
      status: "failure",
      reason: "503 from ex:api",
    });
  });

  it("freezes the declaration it was handed", () => {
    const capabilities = { ...endpoint, sort: ["cpu"] };
    const adapter = source(client(), () => Promise.resolve(page([], 0)));
    expect(Object.isFrozen(adapter.capabilities)).toBe(true);
    capabilities.sort.push("zone");
    expect(adapter.capabilities.sort).toEqual(["cpu"]);
  });

  it("keys the cache by the canonical query, so respellings share it", async () => {
    const queryClient = client();
    const fetchPage = vi.fn().mockResolvedValue(page([{ id: "a" }], 1));
    const adapter = source(queryClient, fetchPage);
    const spelled: Slice = {
      ...emptySlice,
      filter: [
        { field: "status", operator: "eq", operands: ["ready", "failed"] },
      ],
    };
    const respelled: Slice = {
      ...emptySlice,
      filter: [
        { field: "status", operator: "eq", operands: ["failed", "ready"] },
      ],
    };

    const first = delivery();
    adapter.execute(request({ slice: spelled }), first);
    await vi.waitFor(() => expect(first).toHaveBeenCalled());

    const second = delivery();
    adapter.execute(request({ requestId: "i1:r2", slice: respelled }), second);
    expect(second).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(1);
  });

  it("fetches a different query separately", async () => {
    const queryClient = client();
    const fetchPage = vi.fn().mockResolvedValue(page([], 0));
    const adapter = source(queryClient, fetchPage);
    adapter.execute(request(), delivery());
    adapter.execute(
      request({ requestId: "i1:r2", slice: { ...emptySlice, search: "web" } }),
      delivery(),
    );
    await vi.waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(2));
    expect(queryClient.getQueryCache().getAll()).toHaveLength(2);
  });

  it("fetches a different window separately", async () => {
    const queryClient = client();
    const fetchPage = vi.fn().mockResolvedValue(page([], 0));
    const adapter = source(queryClient, fetchPage);
    adapter.execute(request(), delivery());
    adapter.execute(
      request({ requestId: "i1:r2", window: { page: 2, size: 50 } }),
      delivery(),
    );
    await vi.waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(2));
    expect(queryClient.getQueryCache().getAll()).toHaveLength(2);
  });

  it("namespaces two endpoints sharing one client by their key prefix", async () => {
    const queryClient = client();
    const machines = vi.fn().mockResolvedValue(page([{ id: "m" }], 1));
    const images = vi.fn().mockResolvedValue(page([{ id: "i" }], 1));
    source(queryClient, machines, ["machines"]).execute(request(), delivery());
    source(queryClient, images, ["images"]).execute(request(), delivery());
    await vi.waitFor(() => expect(images).toHaveBeenCalledTimes(1));
    expect(machines).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(2);
  });

  it("delivers a cached page at attach time without refetching", async () => {
    const queryClient = client();
    const fetchPage = vi.fn().mockResolvedValue(page([{ id: "a" }], 1));
    const adapter = source(queryClient, fetchPage);
    const warm = delivery();
    const release = adapter.execute(request(), warm);
    await vi.waitFor(() => expect(warm).toHaveBeenCalled());
    release();

    const deliver = delivery();
    adapter.execute(request({ requestId: "i1:r2" }), deliver);
    expect(deliver).toHaveBeenCalledTimes(1);
    expect(deliveredAt(deliver, 0)).toEqual({
      status: "success",
      rows: [{ id: "a" }],
      count: 1,
    });
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("delivers a write into the client's cache as an external change", async () => {
    const queryClient = client();
    const adapter = source(queryClient, () =>
      Promise.resolve(page([{ id: "a" }], 1)),
    );
    const deliver = delivery();
    adapter.execute(request(), deliver);
    await vi.waitFor(() => expect(deliver).toHaveBeenCalledTimes(1));

    queryClient.setQueryData(soleQueryKey(queryClient), page([{ id: "z" }], 2));
    expect(deliver).toHaveBeenCalledTimes(2);
    expect(deliveredAt(deliver, 1)).toEqual({
      status: "success",
      rows: [{ id: "z" }],
      count: 2,
    });
  });

  it("releasing detaches this request's observer and leaves the cache", async () => {
    const queryClient = client();
    const adapter = source(queryClient, () =>
      Promise.resolve(page([{ id: "a" }], 1)),
    );
    const deliver = delivery();
    const release = adapter.execute(request(), deliver);
    await vi.waitFor(() => expect(deliver).toHaveBeenCalledTimes(1));

    release();
    const key = soleQueryKey(queryClient);
    queryClient.setQueryData(key, page([{ id: "z" }], 2));
    expect(deliver).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(key)).toEqual(page([{ id: "z" }], 2));
  });

  it("carries an invalidation's refetched page through to the collection", async () => {
    const queryClient = client();
    const host = createDataViewsProvider({
      schema: createSchema([
        { field: "status", kind: "choices", options: ["ready", "failed"] },
      ]),
    });
    let served = page([{ id: "a" }], 1);
    const binding = createSourceBinding({
      host,
      adapter: source(queryClient, () => Promise.resolve(served)),
    });
    const first = host.refresh();
    await vi.waitFor(() =>
      expect(host.result.get().result.status).toBe("ready"),
    );
    expect(host.result.get().result.provenance?.requestId).toBe(first);

    served = page([{ id: "a" }, { id: "b" }], 2);
    await queryClient.invalidateQueries();
    await vi.waitFor(() => expect(host.result.get().result.count).toBe(2));
    const state = host.result.get();
    expect(state.result.provenance).not.toBeNull();
    expect(state.result.provenance?.requestId).not.toBe(first);
    expect(state.resultsMatchCurrentQuery).toBe(true);
    binding.dispose();
  });

  it("carries the application's row operations", async () => {
    const runAction = vi.fn<SourceActionRunner>().mockResolvedValue([]);
    const adapter = createQuerySource({
      capabilities: endpoint,
      queryKey: ["machines"],
      fetchPage: () => Promise.resolve(page([], 0)),
      observe: (query) => new TanStackObserver(client(), query),
      runAction,
    });
    await adapter.runAction?.({ action: "stop", targets: ["a"], payload: 1 });
    expect(runAction).toHaveBeenCalledWith({
      action: "stop",
      targets: ["a"],
      payload: 1,
    });
  });

  it("has no row operations unless the application supplies them", () => {
    expect(
      "runAction" in source(client(), () => Promise.resolve(page([], 0))),
    ).toBe(false);
  });
});

/** A hand-driven observer: the emissions a real client cannot be made to
 * produce on demand, and a `destroy` that does not detach, so the
 * adapter's own unsubscribe is what has to do the work. */
const fakeObserver = () => {
  let listener: ((observation: QueryObservation<SourcePage>) => void) | null =
    null;
  let current: QueryObservation<SourcePage> = {
    status: "pending",
    data: undefined,
    error: null,
  };
  const handle: QueryObserver<SourcePage> = {
    getCurrentResult: () => current,
    subscribe(next) {
      listener = next;
      return () => {
        listener = null;
      };
    },
    destroy: vi.fn(),
  };
  return {
    handle,
    emit(observation: QueryObservation<SourcePage>): void {
      current = observation;
      listener?.(observation);
    },
  };
};

const fakeSource = (observer: ReturnType<typeof fakeObserver>) =>
  createQuerySource({
    capabilities: endpoint,
    queryKey: ["machines"],
    fetchPage: () => Promise.resolve(page([], 0)),
    observe: () => observer.handle,
  });

describe("createQuerySource observation handling", () => {
  const attach = () => {
    const observer = fakeObserver();
    const deliver = delivery();
    const release = fakeSource(observer).execute(request(), deliver);
    return { observer, deliver, release };
  };

  it("never delivers a pending observation", () => {
    const { deliver } = attach();
    expect(deliver).not.toHaveBeenCalled();
  });

  it("never delivers a success carrying no data", () => {
    const { observer, deliver } = attach();
    observer.emit({ status: "success", data: undefined, error: null });
    expect(deliver).not.toHaveBeenCalled();
  });

  it("delivers a repeated success only when the page changed", () => {
    const { observer, deliver } = attach();
    const first = page([{ id: "a" }], 1);
    observer.emit({ status: "success", data: first, error: null });
    observer.emit({ status: "success", data: first, error: null });
    expect(deliver).toHaveBeenCalledTimes(1);
    observer.emit({
      status: "success",
      data: page([{ id: "b" }], 2),
      error: null,
    });
    expect(deliver).toHaveBeenCalledTimes(2);
    expect(deliveredAt(deliver, 1)).toEqual({
      status: "success",
      rows: [{ id: "b" }],
      count: 2,
    });
  });

  it("delivers a repeated failure only when the error changed", () => {
    const { observer, deliver } = attach();
    const error = new Error("503");
    observer.emit({ status: "error", data: undefined, error });
    observer.emit({ status: "error", data: undefined, error });
    expect(deliver).toHaveBeenCalledTimes(1);
    observer.emit({
      status: "error",
      data: undefined,
      error: new Error("504"),
    });
    expect(deliveredAt(deliver, 1)).toEqual({
      status: "failure",
      reason: "504",
    });
  });

  it("delivers a recovery after a failure", () => {
    const { observer, deliver } = attach();
    observer.emit({
      status: "error",
      data: undefined,
      error: new Error("503"),
    });
    observer.emit({
      status: "success",
      data: page([{ id: "a" }], 1),
      error: null,
    });
    expect(deliver.mock.calls.map((call) => call[0].status)).toEqual([
      "failure",
      "success",
    ]);
  });

  it("delivers the observation already current when it attaches", () => {
    const observer = fakeObserver();
    observer.emit({
      status: "success",
      data: page([{ id: "a" }], 1),
      error: null,
    });
    const deliver = delivery();
    fakeSource(observer).execute(request(), deliver);
    expect(deliver).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes and destroys the observer on release", () => {
    const { observer, deliver, release } = attach();
    release();
    expect(observer.handle.destroy).toHaveBeenCalledTimes(1);
    observer.emit({
      status: "success",
      data: page([{ id: "a" }], 1),
      error: null,
    });
    expect(deliver).not.toHaveBeenCalled();
  });
});
