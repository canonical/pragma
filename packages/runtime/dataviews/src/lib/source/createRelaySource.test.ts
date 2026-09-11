import {
  type ConcreteRequest,
  commitLocalUpdate,
  createOperationDescriptor,
  Environment,
  type GraphQLResponse,
  Network,
  Observable,
  RecordSource,
  Store,
  type Variables,
} from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import type {
  CollectionCoordinatorState,
  CompletionResult,
} from "../collection/createCollectionCoordinator.js";
import createDataViewsProvider from "../provider/createDataViewsProvider.js";
import type { Slice } from "../query/types.js";
import createSchema from "../schema/createSchema.js";
import createRelaySource, {
  type RelayEnvironment,
  type RelayPageRequest,
} from "./createRelaySource.js";
import createSourceBinding from "./createSourceBinding.js";
import type {
  SourceActionRunner,
  SourceCapabilities,
  SourceRequest,
} from "./types.js";

/**
 * The Relay adapter, exercised against the real `relay-runtime`
 * environment: its normalized store, its fetching, its retention and its
 * local updates. The adapter imports nothing from Relay — the environment
 * reaches it through the structural surface, which these tests prove
 * Relay's own `Environment` satisfies.
 */

type Machine = {
  readonly id: string;
  readonly name: string;
  readonly status: string;
};

/** The data `MachinesQuery` selects, as the Relay compiler types it. */
type MachinesData = {
  readonly machines: {
    readonly totalCount: number | null;
    readonly pageInfo: { readonly endCursor: string | null };
    readonly edges: ReadonlyArray<{
      readonly node: Machine | null;
    } | null> | null;
  } | null;
};

/** The compiled query type `MachinesQuery`, as the Relay compiler emits it. */
type MachinesOperation = {
  readonly response: MachinesData;
  readonly variables: Variables;
};

const scalar = (name: string) => ({
  alias: null,
  args: null,
  kind: "ScalarField",
  name,
  storageKey: null,
});

const linked = (
  name: string,
  concreteType: string,
  selections: readonly unknown[],
  extra: { readonly plural?: boolean; readonly args?: unknown } = {},
) => ({
  alias: null,
  args: extra.args ?? null,
  concreteType,
  kind: "LinkedField",
  name,
  plural: extra.plural ?? false,
  selections,
  storageKey: null,
});

const argumentDefinitions = ["first", "after", "status"].map((name) => ({
  defaultValue: null,
  kind: "LocalArgument",
  name,
}));

const machinesField = linked(
  "machines",
  "MachineConnection",
  [
    scalar("totalCount"),
    linked("pageInfo", "PageInfo", [scalar("endCursor")]),
    linked(
      "edges",
      "MachineEdge",
      [
        linked("node", "Machine", [
          scalar("id"),
          scalar("name"),
          scalar("status"),
        ]),
      ],
      { plural: true },
    ),
  ],
  {
    args: ["after", "first", "status"].map((name) => ({
      kind: "Variable",
      name,
      variableName: name,
    })),
  },
);

/**
 * What the Relay compiler emits for:
 *
 *   query MachinesQuery($first: Int!, $after: String, $status: [String!]) {
 *     machines(first: $first, after: $after, status: $status) {
 *       totalCount
 *       pageInfo { endCursor }
 *       edges { node { id name status } }
 *     }
 *   }
 */
const MachinesQuery = {
  kind: "Request",
  fragment: {
    argumentDefinitions,
    kind: "Fragment",
    metadata: null,
    name: "MachinesQuery",
    selections: [machinesField],
    type: "Query",
    abstractKey: null,
  },
  operation: {
    argumentDefinitions,
    kind: "Operation",
    name: "MachinesQuery",
    selections: [machinesField],
  },
  params: {
    cacheID: "MachinesQuery",
    id: null,
    metadata: {},
    name: "MachinesQuery",
    operationKind: "query",
    text: "query MachinesQuery",
  },
} as unknown as ConcreteRequest;

/** The connection handle relay-compiler 21 writes for `@connection`. */
const connectionHandle = {
  alias: null,
  args: machinesField.args,
  filters: ["status"],
  handle: "connection",
  key: "Machines_machines",
  kind: "LinkedHandle",
  name: "machines",
};

/** The compiler records `@connection` on the query itself in its parameters. */
const connectionMetadata = {
  connection: [
    {
      count: "first",
      cursor: "after",
      direction: "forward",
      path: ["machines"],
    },
  ],
};

/** `MachinesQuery` with other normalization selections and parameters. */
const withSelections = (
  selections: readonly unknown[],
  metadata: Record<string, unknown> = {},
): ConcreteRequest =>
  ({
    ...MachinesQuery,
    operation: { ...MachinesQuery.operation, selections },
    params: { ...MachinesQuery.params, metadata },
  }) as unknown as ConcreteRequest;

/** A normalization field holding other selections. */
const field = (
  name: string,
  plural: boolean,
  selections: readonly unknown[],
) => ({ kind: "LinkedField", name, plural, selections });

const machines: readonly Machine[] = [
  { id: "m1", name: "alpha", status: "ready" },
  { id: "m2", name: "beta", status: "failed" },
  { id: "m3", name: "gamma", status: "ready" },
  { id: "m4", name: "delta", status: "failed" },
  { id: "m5", name: "epsilon", status: "ready" },
];

/** The server's answer to one page's variables: a forward connection. */
const pageFor = (variables: Variables): GraphQLResponse => {
  const statuses = variables.status as readonly string[] | null;
  const matching = machines.filter(
    (machine) => statuses === null || statuses.includes(machine.status),
  );
  const after = variables.after as string | null;
  const start =
    after === null
      ? 0
      : matching.findIndex((machine) => `c:${machine.id}` === after) + 1;
  const page = matching.slice(start, start + (variables.first as number));
  const last = page.at(-1);
  return {
    data: {
      machines: {
        totalCount: matching.length,
        pageInfo: { endCursor: last === undefined ? null : `c:${last.id}` },
        edges: page.map((node) => ({ node })),
      },
    },
  };
};

type Fetch = {
  readonly variables: Variables;
  /** Answer the fetch, by default with the server's page. */
  readonly respond: (response?: GraphQLResponse) => void;
  readonly fail: (error: Error) => void;
  /** True when the fetch was abandoned before it was answered. */
  cancelled: boolean;
};

/** A real Relay environment over a network the test answers by hand. */
const relay = () => {
  const fetches: Fetch[] = [];
  const network = Network.create((_request, variables) =>
    Observable.create<GraphQLResponse>((sink) => {
      let answered = false;
      const fetch: Fetch = {
        variables,
        respond(response = pageFor(variables)) {
          answered = true;
          sink.next(response);
          sink.complete();
        },
        fail(error) {
          answered = true;
          sink.error(error);
        },
        cancelled: false,
      };
      fetches.push(fetch);
      return () => {
        fetch.cancelled = !answered;
      };
    }),
  );
  const environment = new Environment({
    network,
    store: new Store(new RecordSource()),
  });
  /** The nth fetch, or a failure rather than a skipped assertion. */
  const fetchAt = (index: number): Fetch => {
    const fetch = fetches[index];
    if (fetch === undefined) {
      throw new Error(`expected a fetch at index ${index}`);
    }
    return fetch;
  };
  return { environment, fetches, fetchAt };
};

/** A forward connection: status filter, no search, no sorting, a total. */
const connectionCapabilities: SourceCapabilities = {
  filter: { status: ["eq"] },
  search: [],
  sort: [],
  sortTerms: 0,
  group: [],
  count: "filtered",
};

const statusOf = (slice: Slice): readonly string[] | null => {
  const predicate = slice.filter.find(({ field }) => field === "status");
  return predicate === undefined ? null : predicate.operands.map(String);
};

const operation = (page: RelayPageRequest) =>
  createOperationDescriptor(MachinesQuery, {
    first: page.first,
    after: page.after,
    status: statusOf(page.slice),
  });

const source = (
  environment: RelayEnvironment,
  overrides: { readonly capabilities?: SourceCapabilities } = {},
) =>
  createRelaySource<MachinesOperation>({
    capabilities: overrides.capabilities ?? connectionCapabilities,
    environment,
    operation,
    connection: (data: MachinesData) => data.machines,
  });

const emptySlice: Slice = { filter: [], search: null, sort: [], group: null };

const request = (overrides: Partial<SourceRequest> = {}): SourceRequest => ({
  requestId: "i1:r1",
  slice: emptySlice,
  window: { page: 1, size: 2 },
  ...overrides,
});

const delivery = () => vi.fn<(result: CompletionResult) => void>();

const idsOf = (result: CompletionResult | undefined) =>
  result?.status === "success"
    ? result.rows.map((row) => (row as Machine).id)
    : result;

/** The latest delivery, or a failure rather than a skipped assertion. */
const lastOf = (deliver: ReturnType<typeof delivery>): CompletionResult => {
  const call = deliver.mock.calls.at(-1);
  if (call === undefined) {
    throw new Error("expected a delivery");
  }
  return call[0];
};

const schema = createSchema([
  { field: "status", kind: "choices", options: ["ready", "failed"] },
]);

/** A provider bound to a Relay source, as an application assembles it. */
const collection = (environment: RelayEnvironment) => {
  const host = createDataViewsProvider({
    schema,
    capabilities: connectionCapabilities,
    window: { page: 1, size: 2 },
  });
  const binding = createSourceBinding({ host, adapter: source(environment) });
  const shown = () => {
    const state: CollectionCoordinatorState = host.result.get();
    return {
      ids: (state.result.rows ?? []).map((row) => (row as Machine).id),
      status: state.result.status,
      count: state.result.count,
      matches: state.resultsMatchCurrentQuery,
      lastError: state.result.lastError,
    };
  };
  return { host, binding, shown };
};

/** An environment whose retentions, subscriptions and fetches are counted. */
const counted = (environment: RelayEnvironment) => {
  const released = { retentions: 0, subscriptions: 0, fetches: 0 };
  const wrapped: RelayEnvironment = {
    retain(operation) {
      const retention = environment.retain(operation);
      return {
        dispose() {
          released.retentions += 1;
          retention.dispose();
        },
      };
    },
    lookup: (selector) => environment.lookup(selector),
    subscribe(snapshot, callback) {
      const subscription = environment.subscribe(snapshot, callback);
      return {
        dispose() {
          released.subscriptions += 1;
          subscription.dispose();
        },
      };
    },
    execute(config) {
      const observable = environment.execute(config);
      return {
        subscribe(observer) {
          const subscription = observable.subscribe(observer);
          return {
            unsubscribe() {
              released.fetches += 1;
              subscription.unsubscribe();
            },
          };
        },
      };
    },
  };
  return { released, wrapped };
};

describe("createRelaySource over relay-runtime", () => {
  it("fetches the first page and delivers its records and total", () => {
    const { environment, fetchAt } = relay();
    const deliver = delivery();
    source(environment).execute(request(), deliver);
    expect(fetchAt(0).variables).toEqual({
      first: 2,
      after: null,
      status: null,
    });
    expect(deliver).not.toHaveBeenCalled();

    fetchAt(0).respond();
    expect(deliver).toHaveBeenCalledTimes(1);
    expect(lastOf(deliver)).toEqual({
      status: "success",
      rows: [machines[0], machines[1]],
      count: 5,
    });
  });

  it("hands the operation builder the query, the page size and the cursor", () => {
    const { environment } = relay();
    const build = vi.fn(operation);
    const filtered: Slice = {
      ...emptySlice,
      filter: [{ field: "status", operator: "eq", operands: ["failed"] }],
    };
    createRelaySource<MachinesOperation>({
      capabilities: connectionCapabilities,
      environment,
      operation: build,
      connection: (data: MachinesData) => data.machines,
    }).execute(request({ slice: filtered }), delivery());
    expect(build).toHaveBeenCalledWith({
      slice: filtered,
      first: 2,
      after: null,
    });
  });

  it("pages forward from each page's end cursor", () => {
    const { environment, fetchAt } = relay();
    const adapter = source(environment);
    adapter.execute(request(), delivery());
    fetchAt(0).respond();

    const deliver = delivery();
    adapter.execute(request({ window: { page: 2, size: 2 } }), deliver);
    expect(fetchAt(1).variables.after).toBe("c:m2");
    fetchAt(1).respond();
    expect(idsOf(lastOf(deliver))).toEqual(["m3", "m4"]);

    adapter.execute(request({ window: { page: 3, size: 2 } }), deliver);
    expect(fetchAt(2).variables.after).toBe("c:m4");
    fetchAt(2).respond();
    expect(idsOf(lastOf(deliver))).toEqual(["m5"]);
  });

  it("refuses a page it has no cursor for rather than inventing one", () => {
    const { environment, fetches } = relay();
    expect(() =>
      source(environment).execute(
        request({ window: { page: 3, size: 2 } }),
        delivery(),
      ),
    ).toThrow("a forward connection reaches page 3 only from page 2");
    expect(fetches).toHaveLength(0);
  });

  it("keeps cursors per page size, since a size change moves every boundary", () => {
    const { environment, fetchAt } = relay();
    const adapter = source(environment);
    adapter.execute(request(), delivery());
    fetchAt(0).respond();
    expect(() =>
      adapter.execute(request({ window: { page: 2, size: 3 } }), delivery()),
    ).toThrow("reaches page 2 only from page 1");
  });

  it("shares cursors between respellings of the same query", () => {
    const { environment, fetchAt } = relay();
    const adapter = source(environment);
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
    adapter.execute(request({ slice: spelled }), delivery());
    fetchAt(0).respond();
    adapter.execute(
      request({ slice: respelled, window: { page: 2, size: 2 } }),
      delivery(),
    );
    expect(fetchAt(1).variables.after).toBe("c:m2");
  });

  it("keeps each query's cursors apart from another's", () => {
    const { environment, fetchAt } = relay();
    const adapter = source(environment);
    adapter.execute(request(), delivery());
    fetchAt(0).respond();
    const failed: Slice = {
      ...emptySlice,
      filter: [{ field: "status", operator: "eq", operands: ["failed"] }],
    };
    expect(() =>
      adapter.execute(
        request({ slice: failed, window: { page: 2, size: 2 } }),
        delivery(),
      ),
    ).toThrow("reaches page 2 only from page 1");
  });

  it("remembers the cursors of the most recently used queries only", () => {
    const { environment, fetchAt } = relay();
    const adapter = source(environment);
    const firstPage = (size: number) => {
      adapter.execute(request({ window: { page: 1, size } }), delivery());
    };
    // Two queries with cursors, the second one older only by use.
    firstPage(2);
    fetchAt(0).respond();
    firstPage(3);
    fetchAt(1).respond();
    for (let size = 4; size < 34; size += 1) {
      firstPage(size);
    }
    // Paging on the oldest makes it the most recently used…
    adapter.execute(request({ window: { page: 2, size: 2 } }), delivery());
    // …so one more query pushes out the one used least recently instead.
    firstPage(34);
    adapter.execute(request({ window: { page: 2, size: 2 } }), delivery());
    expect(fetchAt(34).variables.after).toBe("c:m2");
    expect(() =>
      adapter.execute(request({ window: { page: 2, size: 3 } }), delivery()),
    ).toThrow("reaches page 2 only from page 1");
  });

  it("never lets a refused page push another query's cursors out", () => {
    const { environment, fetchAt } = relay();
    const adapter = source(environment);
    adapter.execute(request(), delivery());
    fetchAt(0).respond();
    // Thirty-one other queries leave the first one the oldest remembered.
    for (let size = 3; size < 34; size += 1) {
      adapter.execute(request({ window: { page: 1, size } }), delivery());
    }
    expect(() =>
      adapter.execute(request({ window: { page: 2, size: 99 } }), delivery()),
    ).toThrow("reaches page 2 only from page 1");
    adapter.execute(request({ window: { page: 2, size: 2 } }), delivery());
    expect(fetchAt(32).variables.after).toBe("c:m2");
  });

  it("reports a null total as unknown, never as zero", () => {
    const { environment, fetchAt } = relay();
    const deliver = delivery();
    source(environment).execute(request(), deliver);
    const answer = pageFor({ first: 2, after: null, status: null });
    fetchAt(0).respond({
      data: {
        machines: {
          ...(answer as { data: { machines: object } }).data.machines,
          totalCount: null,
        },
      },
    });
    expect(lastOf(deliver)).toMatchObject({ status: "success", count: null });
  });

  it("reports an empty last page with no cursor to go on from", () => {
    const { environment, fetchAt } = relay();
    const adapter = source(environment);
    const failed: Slice = {
      ...emptySlice,
      filter: [{ field: "status", operator: "eq", operands: ["missing"] }],
    };
    const deliver = delivery();
    adapter.execute(request({ slice: failed }), deliver);
    fetchAt(0).respond();
    expect(lastOf(deliver)).toEqual({ status: "success", rows: [], count: 0 });
    expect(() =>
      adapter.execute(
        request({ slice: failed, window: { page: 2, size: 2 } }),
        delivery(),
      ),
    ).toThrow("reaches page 2 only from page 1");
  });

  it("delivers a page already in the store at once, and still fetches it", () => {
    const { environment, fetches, fetchAt } = relay();
    const adapter = source(environment);
    const release = adapter.execute(request(), delivery());
    fetchAt(0).respond();
    release();

    const deliver = delivery();
    adapter.execute(request(), deliver);
    expect(idsOf(lastOf(deliver))).toEqual(["m1", "m2"]);
    expect(fetches).toHaveLength(2);

    // The fetch confirms what the store held: nothing new is delivered.
    fetchAt(1).respond();
    expect(deliver).toHaveBeenCalledTimes(1);
  });

  it("delivers what a fetch changed about a page already in the store", () => {
    const { environment, fetchAt } = relay();
    const adapter = source(environment);
    const release = adapter.execute(request(), delivery());
    fetchAt(0).respond();
    release();

    const deliver = delivery();
    adapter.execute(request(), deliver);
    const answer = pageFor({ first: 2, after: null, status: null });
    const renamed = {
      data: {
        machines: {
          ...(answer as { data: { machines: object } }).data.machines,
          edges: [
            { node: { ...machines[0], name: "alpha-renamed" } },
            { node: machines[1] },
          ],
        },
      },
    };
    fetchAt(1).respond(renamed);
    expect(deliver).toHaveBeenCalledTimes(2);
    expect(lastOf(deliver)).toMatchObject({
      rows: [{ id: "m1", name: "alpha-renamed" }, machines[1]],
    });
  });

  it("delivers a local update to a displayed record as an external change", () => {
    const { environment, fetchAt } = relay();
    const deliver = delivery();
    source(environment).execute(request(), deliver);
    fetchAt(0).respond();

    commitLocalUpdate(environment, (store) => {
      store.get("m1")?.setValue("alpha-renamed", "name");
    });
    expect(deliver).toHaveBeenCalledTimes(2);
    expect(lastOf(deliver)).toMatchObject({
      status: "success",
      rows: [{ id: "m1", name: "alpha-renamed" }, machines[1]],
    });

    // An update to a record this page does not show changes nothing.
    commitLocalUpdate(environment, (store) => {
      store.get("m5")?.setValue("epsilon-renamed", "name");
    });
    expect(deliver).toHaveBeenCalledTimes(2);
  });

  it("delivers a failed fetch as a failure carrying its message", () => {
    const { environment, fetchAt } = relay();
    const deliver = delivery();
    source(environment).execute(request(), deliver);
    fetchAt(0).fail(new Error("502 from the graph"));
    expect(deliver.mock.calls).toEqual([
      [{ status: "failure", reason: "502 from the graph" }],
    ]);
  });

  it("fails a page whose response left selected data missing", () => {
    const { environment, fetchAt } = relay();
    const deliver = delivery();
    source(environment).execute(request(), deliver);
    const warn = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchAt(0).respond({
      data: {
        machines: {
          totalCount: 5,
          pageInfo: { endCursor: "c:m2" },
          // The second record lacks a field the query selects.
          edges: [
            { node: machines[0] },
            { node: { id: "m2", status: "failed" } },
          ],
        },
      },
    });
    warn.mockRestore();
    expect(deliver.mock.calls).toEqual([
      [
        {
          status: "failure",
          reason: "the store is missing data this page selects",
        },
      ],
    ]);
  });

  it("fails once while the store stays incomplete, and recovers when it is whole", () => {
    const { environment, fetchAt } = relay();
    const deliver = delivery();
    source(environment).execute(request(), deliver);
    fetchAt(0).respond();

    commitLocalUpdate(environment, (store) => {
      store.get("m1")?.setValue(undefined, "name");
    });
    commitLocalUpdate(environment, (store) => {
      store.get("m2")?.setValue(undefined, "name");
    });
    expect(deliver.mock.calls.slice(1)).toEqual([
      [
        {
          status: "failure",
          reason: "the store is missing data this page selects",
        },
      ],
    ]);

    commitLocalUpdate(environment, (store) => {
      store.get("m1")?.setValue("alpha", "name");
      store.get("m2")?.setValue("beta", "name");
    });
    expect(idsOf(lastOf(deliver))).toEqual(["m1", "m2"]);
  });

  it("fails a page with a missing record rather than delivering it shorter", () => {
    const { environment, fetchAt } = relay();
    const deliver = delivery();
    source(environment).execute(request(), deliver);
    fetchAt(0).respond({
      data: {
        machines: {
          totalCount: 5,
          pageInfo: { endCursor: "c:m2" },
          edges: [{ node: machines[0] }, { node: null }],
        },
      },
    });
    expect(lastOf(deliver)).toEqual({
      status: "failure",
      reason: "the connection carries an edge without a record",
    });
  });

  it("fails a page when a displayed record is deleted from the store", () => {
    const { environment, fetchAt } = relay();
    const deliver = delivery();
    source(environment).execute(request(), deliver);
    fetchAt(0).respond();
    commitLocalUpdate(environment, (store) => {
      store.delete("m2");
    });
    expect(lastOf(deliver)).toEqual({
      status: "failure",
      reason: "the connection carries an edge without a record",
    });
  });

  it("fails a response that carries no connection", () => {
    const { environment, fetchAt } = relay();
    const deliver = delivery();
    source(environment).execute(request(), deliver);
    fetchAt(0).respond({ data: { machines: null } });
    expect(lastOf(deliver)).toEqual({
      status: "failure",
      reason: "the response carries no connection",
    });
  });

  it("fails a page with a missing edge rather than delivering it shorter", () => {
    const { environment, fetchAt } = relay();
    const deliver = delivery();
    source(environment).execute(request(), deliver);
    fetchAt(0).respond({
      data: {
        machines: {
          totalCount: 5,
          pageInfo: { endCursor: "c:m2" },
          edges: [{ node: machines[0] }, null],
        },
      },
    });
    expect(lastOf(deliver)).toEqual({
      status: "failure",
      reason: "the connection carries an edge without a record",
    });
  });

  it("fails a connection that carries no edges", () => {
    const { environment, fetchAt } = relay();
    const deliver = delivery();
    source(environment).execute(request(), deliver);
    fetchAt(0).respond({
      data: {
        machines: { totalCount: 5, pageInfo: { endCursor: null }, edges: null },
      },
    });
    expect(lastOf(deliver)).toEqual({
      status: "failure",
      reason: "the connection carries no edges",
    });
  });

  it("cancels a fetch still in flight on release", () => {
    const { environment, fetchAt } = relay();
    const deliver = delivery();
    const release = source(environment).execute(request(), deliver);
    release();
    expect(fetchAt(0).cancelled).toBe(true);
    fetchAt(0).respond();
    expect(deliver).not.toHaveBeenCalled();
  });

  it("stops following the store on release", () => {
    const { environment, fetchAt } = relay();
    const deliver = delivery();
    const release = source(environment).execute(request(), deliver);
    fetchAt(0).respond();
    expect(deliver).toHaveBeenCalledTimes(1);
    release();
    commitLocalUpdate(environment, (store) => {
      store.get("m1")?.setValue("renamed", "name");
    });
    expect(deliver).toHaveBeenCalledTimes(1);
  });

  it("releases the retention, the store subscription and the fetch together", () => {
    const { environment, fetchAt } = relay();
    const { released, wrapped } = counted(environment);
    const release = source(wrapped).execute(request(), delivery());
    fetchAt(0).respond();
    expect(released).toEqual({ retentions: 0, subscriptions: 0, fetches: 0 });
    release();
    expect(released).toEqual({ retentions: 1, subscriptions: 1, fetches: 1 });
  });

  it.each([
    [
      "on the query itself",
      withSelections(
        [...MachinesQuery.operation.selections, connectionHandle],
        connectionMetadata,
      ),
    ],
    [
      "through an unmasked fragment spread",
      withSelections([...MachinesQuery.operation.selections, connectionHandle]),
    ],
    [
      "under a parent field",
      withSelections(
        [
          field("viewer", false, [
            ...MachinesQuery.operation.selections,
            connectionHandle,
          ]),
        ],
        connectionMetadata,
      ),
    ],
  ])("refuses a query paging through @connection %s", (_, merging) => {
    const { environment, fetches } = relay();
    const adapter = createRelaySource<MachinesOperation>({
      capabilities: connectionCapabilities,
      environment,
      operation: (page) =>
        createOperationDescriptor(merging, {
          first: page.first,
          after: page.after,
          status: null,
        }),
      connection: (data: MachinesData) => data.machines,
    });
    expect(() => adapter.execute(request(), delivery())).toThrow(
      "a query paging through @connection merges its pages",
    );
    expect(fetches).toHaveLength(0);
  });

  it("never refuses a query for a row's own @connection list", () => {
    const { environment, fetches } = relay();
    const rowsWithLists = withSelections([
      field("machines", false, [
        field("edges", true, [field("node", false, [connectionHandle])]),
      ]),
    ]);
    createRelaySource<MachinesOperation>({
      capabilities: connectionCapabilities,
      environment,
      operation: (page) =>
        createOperationDescriptor(rowsWithLists, {
          first: page.first,
          after: page.after,
          status: null,
        }),
      connection: (data: MachinesData) => data.machines,
    }).execute(request(), delivery());
    expect(fetches).toHaveLength(1);
  });

  it("never lets a refused @connection query push another query's cursors out", () => {
    const { environment, fetchAt } = relay();
    const merging = withSelections(
      [...MachinesQuery.operation.selections, connectionHandle],
      connectionMetadata,
    );
    const adapter = createRelaySource<MachinesOperation>({
      capabilities: connectionCapabilities,
      environment,
      // One page size stands for a query paging through @connection.
      operation: (page) =>
        createOperationDescriptor(page.first === 99 ? merging : MachinesQuery, {
          first: page.first,
          after: page.after,
          status: null,
        }),
      connection: (data: MachinesData) => data.machines,
    });
    adapter.execute(request(), delivery());
    fetchAt(0).respond();
    for (let size = 3; size < 34; size += 1) {
      adapter.execute(request({ window: { page: 1, size } }), delivery());
    }
    expect(() =>
      adapter.execute(request({ window: { page: 1, size: 99 } }), delivery()),
    ).toThrow("merges its pages");
    adapter.execute(request({ window: { page: 2, size: 2 } }), delivery());
    expect(fetchAt(32).variables.after).toBe("c:m2");
  });

  it("forgets the next page once its page no longer ends in a cursor", () => {
    const { environment, fetchAt } = relay();
    const adapter = source(environment);
    adapter.execute(request(), delivery());
    fetchAt(0).respond();
    commitLocalUpdate(environment, (store) => {
      store
        .getRoot()
        .getLinkedRecord("machines", { after: null, first: 2, status: null })
        ?.getLinkedRecord("pageInfo")
        ?.setValue(null, "endCursor");
    });
    expect(() =>
      adapter.execute(request({ window: { page: 2, size: 2 } }), delivery()),
    ).toThrow("reaches page 2 only from page 1");
  });

  it("fails a page whose connection selector throws", () => {
    const { environment, fetchAt } = relay();
    const deliver = delivery();
    createRelaySource<MachinesOperation>({
      capabilities: connectionCapabilities,
      environment,
      operation,
      connection: () => {
        throw new Error("the query has no machines field");
      },
    }).execute(request(), deliver);
    fetchAt(0).respond();
    expect(lastOf(deliver)).toEqual({
      status: "failure",
      reason: "the query has no machines field",
    });
  });

  it("fails a page whose selector throws on a store change, never the writer", () => {
    const { environment, fetchAt } = relay();
    const deliver = delivery();
    let reads = 0;
    createRelaySource<MachinesOperation>({
      capabilities: connectionCapabilities,
      environment,
      operation,
      connection: (data: MachinesData) => {
        reads += 1;
        if (reads > 1) {
          throw new Error("the renamed field is not a machine");
        }
        return data.machines;
      },
    }).execute(request(), deliver);
    fetchAt(0).respond();
    expect(lastOf(deliver)).toMatchObject({ status: "success" });
    expect(() =>
      commitLocalUpdate(environment, (store) => {
        store.get("m1")?.setValue("alpha-renamed", "name");
      }),
    ).not.toThrow();
    expect(lastOf(deliver)).toEqual({
      status: "failure",
      reason: "the renamed field is not a machine",
    });
  });

  it("releases what it acquired when the fetch cannot start", () => {
    const { environment } = relay();
    const { released, wrapped } = counted(environment);
    const offline: RelayEnvironment = {
      ...wrapped,
      execute() {
        throw new Error("offline");
      },
    };
    expect(() => source(offline).execute(request(), delivery())).toThrow(
      "offline",
    );
    expect(released).toEqual({ retentions: 1, subscriptions: 1, fetches: 0 });
  });

  it("freezes the declaration it was handed", () => {
    const { environment } = relay();
    const capabilities = { ...connectionCapabilities, group: ["status"] };
    const adapter = source(environment, { capabilities });
    capabilities.group.push("name");
    expect(Object.isFrozen(adapter.capabilities)).toBe(true);
    expect(adapter.capabilities.group).toEqual(["status"]);
  });

  it("carries the application's row operations", async () => {
    const { environment } = relay();
    const runAction: SourceActionRunner = vi.fn().mockResolvedValue([]);
    const adapter = createRelaySource<MachinesOperation>({
      capabilities: connectionCapabilities,
      environment,
      operation,
      connection: (data: MachinesData) => data.machines,
      runAction,
    });
    expect(adapter.runAction).toBe(runAction);
    expect("runAction" in source(environment)).toBe(false);
  });
});

describe("createRelaySource bound to a collection", () => {
  it("publishes pages under the collection's request identities", () => {
    const { environment, fetchAt } = relay();
    const { host, shown, binding } = collection(environment);
    host.refresh();
    fetchAt(0).respond();
    expect(shown()).toMatchObject({
      ids: ["m1", "m2"],
      status: "ready",
      count: 5,
      matches: true,
    });

    host.navigateWindow(2);
    expect(shown().status).toBe("pending");
    fetchAt(1).respond();
    expect(shown()).toMatchObject({ ids: ["m3", "m4"], status: "ready" });
    binding.dispose();
  });

  it("never lets an abandoned filter replace a newer one", () => {
    const { environment, fetchAt } = relay();
    const { host, shown, binding } = collection(environment);
    host.fields.status.eq.set(["failed"]);
    host.fields.status.eq.set(["ready"]);
    expect(fetchAt(0).cancelled).toBe(true);

    fetchAt(1).respond();
    expect(shown()).toMatchObject({ ids: ["m1", "m3"], status: "ready" });
    // The abandoned fetch answering late reaches nothing.
    fetchAt(0).respond();
    expect(shown()).toMatchObject({
      ids: ["m1", "m3"],
      status: "ready",
      count: 3,
      matches: true,
    });
    binding.dispose();
  });

  it("follows a local update into the collection without refetching", () => {
    const { environment, fetches, fetchAt } = relay();
    const { host, shown, binding } = collection(environment);
    host.refresh();
    fetchAt(0).respond();
    const before = host.result.get().result.provenance;

    commitLocalUpdate(environment, (store) => {
      store.get("m2")?.setValue("failed", "status");
      store.get("m2")?.setValue("beta-renamed", "name");
    });
    const rows = host.result.get().result.rows as readonly Machine[];
    expect(rows[1]).toEqual({
      id: "m2",
      name: "beta-renamed",
      status: "failed",
    });
    expect(host.result.get().result.provenance).not.toEqual(before);
    expect(shown().matches).toBe(true);
    expect(fetches).toHaveLength(1);
    binding.dispose();
  });

  it("reports a page reached without its cursor as a visible failure", () => {
    const { environment } = relay();
    const host = createDataViewsProvider({
      schema,
      capabilities: connectionCapabilities,
      window: { page: 3, size: 2 },
    });
    const binding = createSourceBinding({ host, adapter: source(environment) });
    host.refresh();
    expect(host.result.get().result).toMatchObject({
      status: "error",
      lastError: "a forward connection reaches page 3 only from page 2",
    });
    binding.dispose();
  });

  it("keeps the rows but reports the failure when a refetch fails", () => {
    const { environment, fetchAt } = relay();
    const { host, shown, binding } = collection(environment);
    host.refresh();
    fetchAt(0).respond();
    host.refresh();
    fetchAt(1).fail(new Error("timeout"));
    expect(shown()).toMatchObject({
      ids: ["m1", "m2"],
      status: "ready",
      lastError: "timeout",
    });
    binding.dispose();
  });

  it("releases everything when the scope rotates", () => {
    const { environment, fetchAt } = relay();
    const { released, wrapped } = counted(environment);
    const host = createDataViewsProvider({ schema });
    const binding = createSourceBinding({ host, adapter: source(wrapped) });
    host.refresh();
    host.rotateScope();
    expect(released).toEqual({ retentions: 1, subscriptions: 1, fetches: 1 });
    expect(fetchAt(0).cancelled).toBe(true);
    expect(host.result.get().result.status).toBe("idle");
    binding.dispose();
  });

  it("releases everything when the binding or the provider is disposed", () => {
    const { environment, fetchAt } = relay();
    const disposing = counted(environment);
    const host = createDataViewsProvider({ schema });
    const binding = createSourceBinding({
      host,
      adapter: source(disposing.wrapped),
    });
    host.refresh();
    binding.dispose();
    expect(disposing.released).toEqual({
      retentions: 1,
      subscriptions: 1,
      fetches: 1,
    });

    const ending = counted(environment);
    const other = createDataViewsProvider({ schema });
    createSourceBinding({ host: other, adapter: source(ending.wrapped) });
    other.refresh();
    fetchAt(1).respond();
    other.dispose();
    expect(ending.released).toEqual({
      retentions: 1,
      subscriptions: 1,
      fetches: 1,
    });
  });
});
