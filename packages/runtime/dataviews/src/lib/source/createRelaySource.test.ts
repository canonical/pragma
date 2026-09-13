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
import {
  declareCapabilities,
  declareSorting,
} from "../../../testing/fixtures.js";
import { createDataViewsProvider } from "../provider/index.js";
import {
  DEFAULT_WINDOW,
  type Query,
  type ResultWindow,
  type Slice,
} from "../query/index.js";
import type {
  Count,
  SourceCounts,
  SourceDelivery,
  SourceRefusal,
} from "../result/index.js";
import { createSchema } from "../schema/index.js";
import createRelaySource, {
  type RelayEnvironment,
  type RelayPageRequest,
} from "./createRelaySource.js";
import createSourceBinding from "./createSourceBinding.js";
import type {
  Source,
  SourceActionRunner,
  SourceCapabilities,
  SourceRequest,
} from "./types.js";

/**
 * The Relay source, exercised against the real `relay-runtime`
 * environment: its normalized store, its fetching, its retention and its
 * local updates. The source imports nothing from Relay — the environment
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
    readonly pageInfo: {
      readonly endCursor: string | null;
      readonly hasNextPage: boolean | null;
    };
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
    linked("pageInfo", "PageInfo", [
      scalar("endCursor"),
      scalar("hasNextPage"),
    ]),
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
 *       pageInfo { endCursor hasNextPage }
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
  const statuses = variables["status"] as readonly string[] | null;
  const matching = machines.filter(
    (machine) => statuses === null || statuses.includes(machine.status),
  );
  const after = variables["after"] as string | null;
  const start =
    after === null
      ? 0
      : matching.findIndex((machine) => `c:${machine.id}` === after) + 1;
  const size = variables["first"] as number;
  const page = matching.slice(start, start + size);
  const last = page.at(-1);
  return {
    data: {
      machines: {
        totalCount: matching.length,
        pageInfo: {
          endCursor: last === undefined ? null : `c:${last.id}`,
          hasNextPage: start + size < matching.length,
        },
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

/** A forward connection: a status filter, no search, no declareSorting, a total. */
const connectionCapabilities: SourceCapabilities = declareCapabilities({
  filter: { status: ["eq"] },
  counts: { visible: "exact", matched: "exact", total: "none" },
  pagination: { mode: "cursor", backward: false, durable: false },
});

const UNKNOWN: Count = { kind: "unknown" };

const exactly = (value: number): Count => ({ kind: "exact", value });

/** What an ungrouped connection counts: the matched rows are the visible ones. */
const countsOf = (matched: Count): SourceCounts => ({
  visible: matched,
  matched,
  total: UNKNOWN,
});

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

const emptySlice: Slice = { filter: [], search: null, sort: [], group: [] };

/** A window over the two-row pages these tests read. */
const paged = (overrides: Partial<ResultWindow> = {}): ResultWindow => ({
  ...DEFAULT_WINDOW,
  size: 2,
  ...overrides,
});

const request = (overrides: Partial<SourceRequest> = {}): SourceRequest => ({
  requestId: "i1:r1",
  slice: emptySlice,
  window: paged(),
  ...overrides,
});

/** What the source refuses one query, failing loudly without the port. */
const refusalsOf = (
  adapter: Source,
  overrides: Partial<Query> = {},
): readonly SourceRefusal[] => {
  const { refuses } = adapter;
  if (refuses === undefined) {
    throw new Error(
      "expected a source declareCapabilities which pages it cannot reach",
    );
  }
  return refuses({ slice: emptySlice, window: paged(), ...overrides });
};

const unreachable = (page: number): SourceRefusal => ({
  part: "window",
  code: "unreachable-page",
  field: null,
  operator: null,
  reason: `a forward connection reaches page ${page} only from page ${page - 1}`,
});

const delivery = () => vi.fn<(delivered: SourceDelivery) => void>();

const idsOf = (delivered: SourceDelivery) =>
  delivered.status === "succeeded"
    ? delivered.page.rows.map((row) => (row as Machine).id)
    : delivered;

/** The latest delivery, or a failure rather than a skipped assertion. */
const lastOf = (deliver: ReturnType<typeof delivery>): SourceDelivery => {
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
    window: paged(),
  });
  const release = createSourceBinding({
    host,
    source: source(environment),
  }).observe();
  const shown = () => {
    const state = host.state.get();
    return {
      ids: (state.result.rows ?? []).map((row) => (row as Machine).id),
      status: state.result.status,
      counts: state.result.counts,
      matches: state.resultMatchesQuery,
      problem: state.result.problem,
    };
  };
  return { host, release, shown };
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
  it("delivers the first page as rows, counts, more and cursors together", () => {
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
      status: "succeeded",
      page: {
        rows: [machines[0], machines[1]],
        groups: null,
        counts: countsOf(exactly(5)),
        more: true,
        cursors: { next: "c:m2", previous: null },
      },
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
    adapter.execute(request({ window: paged({ page: 2 }) }), deliver);
    expect(fetchAt(1).variables["after"]).toBe("c:m2");
    fetchAt(1).respond();
    expect(idsOf(lastOf(deliver))).toEqual(["m3", "m4"]);

    adapter.execute(request({ window: paged({ page: 3 }) }), deliver);
    expect(fetchAt(2).variables["after"]).toBe("c:m4");
    fetchAt(2).respond();
    expect(idsOf(lastOf(deliver))).toEqual(["m5"]);
    // The last page ends in a cursor, and no page follows it.
    expect(lastOf(deliver)).toMatchObject({
      page: { more: false, cursors: { next: null, previous: null } },
    });
  });

  it("refuses a page no token and no remembered cursor reaches", () => {
    const { environment, fetches } = relay();
    expect(
      refusalsOf(source(environment), { window: paged({ page: 3 }) }),
    ).toEqual([unreachable(3)]);
    expect(fetches).toHaveLength(0);
  });

  it("refuses nothing for the first page or a page its trail reaches", () => {
    const { environment, fetchAt } = relay();
    const adapter = source(environment);
    expect(refusalsOf(adapter)).toEqual([]);
    adapter.execute(request(), delivery());
    fetchAt(0).respond();
    expect(refusalsOf(adapter, { window: paged({ page: 2 }) })).toEqual([]);
  });

  it("prefers the window's own token over a remembered cursor", () => {
    const { environment, fetchAt } = relay();
    const adapter = source(environment);
    adapter.execute(request(), delivery());
    fetchAt(0).respond();
    // The trail remembers "c:m2" for page two; the window names another, and
    // a token reaches a page no trail ever did.
    const carried = paged({ page: 2, cursor: "c:m1" });
    expect(refusalsOf(adapter, { window: carried })).toEqual([]);
    expect(
      refusalsOf(adapter, { window: paged({ page: 9, cursor: "c:m4" }) }),
    ).toEqual([]);
    adapter.execute(request({ window: carried }), delivery());
    expect(fetchAt(1).variables["after"]).toBe("c:m1");
  });

  it("guards execute against a page nothing reaches", () => {
    const { environment, fetches } = relay();
    expect(() =>
      source(environment).execute(
        request({ window: paged({ page: 3 }) }),
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
    expect(
      refusalsOf(adapter, { window: paged({ page: 2, size: 3 }) }),
    ).toEqual([unreachable(2)]);
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
      request({ slice: respelled, window: paged({ page: 2 }) }),
      delivery(),
    );
    expect(fetchAt(1).variables["after"]).toBe("c:m2");
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
    expect(
      refusalsOf(adapter, { slice: failed, window: paged({ page: 2 }) }),
    ).toEqual([unreachable(2)]);
  });

  it("remembers the cursors of the most recently used queries only", () => {
    const { environment, fetchAt } = relay();
    const adapter = source(environment);
    const firstPage = (size: number) => {
      adapter.execute(request({ window: paged({ size }) }), delivery());
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
    adapter.execute(request({ window: paged({ page: 2 }) }), delivery());
    // …so one more query pushes out the one used least recently instead.
    firstPage(34);
    adapter.execute(request({ window: paged({ page: 2 }) }), delivery());
    expect(fetchAt(34).variables["after"]).toBe("c:m2");
    expect(
      refusalsOf(adapter, { window: paged({ page: 2, size: 3 }) }),
    ).toEqual([unreachable(2)]);
  });

  it("never lets a refused page push another query's cursors out", () => {
    const { environment, fetchAt } = relay();
    const adapter = source(environment);
    adapter.execute(request(), delivery());
    fetchAt(0).respond();
    // Thirty-one other queries leave the first one the oldest remembered.
    for (let size = 3; size < 34; size += 1) {
      adapter.execute(request({ window: paged({ size }) }), delivery());
    }
    const unreached = paged({ page: 2, size: 99 });
    expect(refusalsOf(adapter, { window: unreached })).toEqual([
      unreachable(2),
    ]);
    expect(() =>
      adapter.execute(request({ window: unreached }), delivery()),
    ).toThrow("reaches page 2 only from page 1");
    adapter.execute(request({ window: paged({ page: 2 }) }), delivery());
    expect(fetchAt(32).variables["after"]).toBe("c:m2");
  });

  it("counts a null total as unknown, and an absent next page as unknown", () => {
    const { environment, fetchAt } = relay();
    const deliver = delivery();
    source(environment).execute(request(), deliver);
    fetchAt(0).respond({
      data: {
        machines: {
          totalCount: null,
          pageInfo: { endCursor: "c:m2", hasNextPage: null },
          edges: [{ node: machines[0] }, { node: machines[1] }],
        },
      },
    });
    expect(lastOf(deliver)).toMatchObject({
      status: "succeeded",
      page: {
        counts: countsOf(UNKNOWN),
        more: null,
        cursors: { next: "c:m2", previous: null },
      },
    });
  });

  it("delivers an empty last page with no cursor to go on from", () => {
    const { environment, fetchAt } = relay();
    const adapter = source(environment);
    const failed: Slice = {
      ...emptySlice,
      filter: [{ field: "status", operator: "eq", operands: ["missing"] }],
    };
    const deliver = delivery();
    adapter.execute(request({ slice: failed }), deliver);
    fetchAt(0).respond();
    expect(lastOf(deliver)).toEqual({
      status: "succeeded",
      page: {
        rows: [],
        groups: null,
        counts: countsOf(exactly(0)),
        more: false,
        cursors: { next: null, previous: null },
      },
    });
    expect(
      refusalsOf(adapter, { slice: failed, window: paged({ page: 2 }) }),
    ).toEqual([unreachable(2)]);
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
    fetchAt(1).respond({
      data: {
        machines: {
          totalCount: 5,
          pageInfo: { endCursor: "c:m2", hasNextPage: true },
          edges: [
            { node: { ...machines[0], name: "alpha-renamed" } },
            { node: machines[1] },
          ],
        },
      },
    });
    expect(deliver).toHaveBeenCalledTimes(2);
    expect(lastOf(deliver)).toMatchObject({
      page: { rows: [{ id: "m1", name: "alpha-renamed" }, machines[1]] },
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
      status: "succeeded",
      page: { rows: [{ id: "m1", name: "alpha-renamed" }, machines[1]] },
    });

    // An update to a record this page does not show changes nothing.
    commitLocalUpdate(environment, (store) => {
      store.get("m5")?.setValue("epsilon-renamed", "name");
    });
    expect(deliver).toHaveBeenCalledTimes(2);
  });

  it("delivers a failed fetch as a failure carrying its cause", () => {
    const { environment, fetchAt } = relay();
    const deliver = delivery();
    source(environment).execute(request(), deliver);
    const error = new Error("502 from the graph");
    fetchAt(0).fail(error);
    expect(deliver.mock.calls).toEqual([
      [
        {
          status: "failed",
          failure: {
            reason: "502 from the graph",
            cause: error,
            transient: null,
          },
        },
      ],
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
          pageInfo: { endCursor: "c:m2", hasNextPage: true },
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
          status: "failed",
          failure: {
            reason: "the store is missing data this page selects",
            cause: null,
            transient: null,
          },
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
          status: "failed",
          failure: {
            reason: "the store is missing data this page selects",
            cause: null,
            transient: null,
          },
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
          pageInfo: { endCursor: "c:m2", hasNextPage: true },
          edges: [{ node: machines[0] }, { node: null }],
        },
      },
    });
    expect(lastOf(deliver)).toMatchObject({
      status: "failed",
      failure: { reason: "the connection carries an edge without a record" },
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
    expect(lastOf(deliver)).toMatchObject({
      status: "failed",
      failure: { reason: "the connection carries an edge without a record" },
    });
  });

  it("fails a response that carries no connection", () => {
    const { environment, fetchAt } = relay();
    const deliver = delivery();
    source(environment).execute(request(), deliver);
    fetchAt(0).respond({ data: { machines: null } });
    expect(lastOf(deliver)).toEqual({
      status: "failed",
      failure: {
        reason: "the response carries no connection",
        cause: null,
        transient: null,
      },
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
          pageInfo: { endCursor: "c:m2", hasNextPage: true },
          edges: [{ node: machines[0] }, null],
        },
      },
    });
    expect(lastOf(deliver)).toMatchObject({
      status: "failed",
      failure: { reason: "the connection carries an edge without a record" },
    });
  });

  it("fails a connection that carries no edges", () => {
    const { environment, fetchAt } = relay();
    const deliver = delivery();
    source(environment).execute(request(), deliver);
    fetchAt(0).respond({
      data: {
        machines: {
          totalCount: 5,
          pageInfo: { endCursor: null, hasNextPage: false },
          edges: null,
        },
      },
    });
    expect(lastOf(deliver)).toMatchObject({
      status: "failed",
      failure: { reason: "the connection carries no edges" },
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

  it("never refuses a query carrying a handle that is not a connection", () => {
    // Relay writes a handle for other directives too — an appended edge, a
    // deleted record, a client field. Only `@connection` merges pages, so
    // only `@connection` is refused.
    const { environment, fetches } = relay();
    const otherHandle = withSelections([
      ...MachinesQuery.operation.selections,
      { ...connectionHandle, handle: "deleteRecord", key: "" },
    ]);
    createRelaySource<MachinesOperation>({
      capabilities: connectionCapabilities,
      environment,
      operation: (page) =>
        createOperationDescriptor(otherHandle, {
          first: page.first,
          after: page.after,
          status: null,
        }),
      connection: (data: MachinesData) => data.machines,
    }).execute(request(), delivery());
    expect(fetches).toHaveLength(1);
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
      adapter.execute(request({ window: paged({ size }) }), delivery());
    }
    expect(() =>
      adapter.execute(request({ window: paged({ size: 99 }) }), delivery()),
    ).toThrow("merges its pages");
    adapter.execute(request({ window: paged({ page: 2 }) }), delivery());
    expect(fetchAt(32).variables["after"]).toBe("c:m2");
  });

  it("forgets the next page once its page no longer ends in a cursor", () => {
    const { environment, fetchAt } = relay();
    const adapter = source(environment);
    const deliver = delivery();
    adapter.execute(request(), deliver);
    fetchAt(0).respond();
    commitLocalUpdate(environment, (store) => {
      store
        .getRoot()
        .getLinkedRecord("machines", { after: null, first: 2, status: null })
        ?.getLinkedRecord("pageInfo")
        ?.setValue(null, "endCursor");
    });
    expect(lastOf(deliver)).toMatchObject({
      page: { more: true, cursors: { next: null, previous: null } },
    });
    expect(refusalsOf(adapter, { window: paged({ page: 2 }) })).toEqual([
      unreachable(2),
    ]);
  });

  it("fails a page whose connection selector throws", () => {
    const { environment, fetchAt } = relay();
    const deliver = delivery();
    const thrown = new Error("the query has no machines field");
    createRelaySource<MachinesOperation>({
      capabilities: connectionCapabilities,
      environment,
      operation,
      connection: () => {
        throw thrown;
      },
    }).execute(request(), deliver);
    fetchAt(0).respond();
    expect(lastOf(deliver)).toEqual({
      status: "failed",
      failure: {
        reason: "the query has no machines field",
        cause: thrown,
        transient: null,
      },
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
    expect(lastOf(deliver)).toMatchObject({ status: "succeeded" });
    expect(() =>
      commitLocalUpdate(environment, (store) => {
        store.get("m1")?.setValue("alpha-renamed", "name");
      }),
    ).not.toThrow();
    expect(lastOf(deliver)).toMatchObject({
      status: "failed",
      failure: { reason: "the renamed field is not a machine" },
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
    const fields = ["name"];
    const capabilities = declareCapabilities({ sort: declareSorting(fields) });
    const adapter = source(environment, { capabilities });
    fields.push("zone");
    expect(Object.isFrozen(adapter.capabilities)).toBe(true);
    expect(adapter.capabilities.sort.fields).toEqual(["name"]);
  });

  it("carries the application's row operations", () => {
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
    const plain = source(environment);
    expect("runAction" in plain).toBe(false);
  });
});

describe("createRelaySource bound to a collection", () => {
  it("publishes pages under the collection's request identities", () => {
    const { environment, fetchAt } = relay();
    const { host, shown, release } = collection(environment);
    host.refresh();
    fetchAt(0).respond();
    expect(shown()).toMatchObject({
      ids: ["m1", "m2"],
      status: "ready",
      counts: countsOf(exactly(5)),
      matches: true,
    });

    host.navigateWindow({ page: 2 });
    expect(shown().status).toBe("pending");
    fetchAt(1).respond();
    expect(shown()).toMatchObject({ ids: ["m3", "m4"], status: "ready" });
    release();
  });

  it("never lets an abandoned filter replace a newer one", () => {
    const { environment, fetchAt } = relay();
    const { host, shown, release } = collection(environment);
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
      counts: countsOf(exactly(3)),
      matches: true,
    });
    release();
  });

  it("follows a local update into the collection without refetching", () => {
    const { environment, fetches, fetchAt } = relay();
    const { host, shown, release } = collection(environment);
    host.refresh();
    fetchAt(0).respond();
    const before = host.state.get().result.provenance;

    commitLocalUpdate(environment, (store) => {
      store.get("m2")?.setValue("failed", "status");
      store.get("m2")?.setValue("beta-renamed", "name");
    });
    const rows = host.state.get().result.rows as readonly Machine[];
    expect(rows[1]).toEqual({
      id: "m2",
      name: "beta-renamed",
      status: "failed",
    });
    expect(host.state.get().result.provenance).not.toEqual(before);
    expect(shown().matches).toBe(true);
    expect(fetches).toHaveLength(1);
    release();
  });

  it("reports a page reached without its cursor as a refusal", () => {
    const { environment, fetches } = relay();
    const host = createDataViewsProvider({
      schema,
      capabilities: connectionCapabilities,
      window: paged({ page: 3 }),
    });
    const release = createSourceBinding({
      host,
      source: source(environment),
    }).observe();
    host.refresh();
    expect(host.state.get().result).toMatchObject({
      status: "failed",
      rows: null,
      problem: { status: "refused", refusals: [unreachable(3)] },
    });
    // A refused request costs no round trip.
    expect(fetches).toHaveLength(0);
    release();
  });

  it("keeps the rows and reports the failure when a refetch fails", () => {
    const { environment, fetchAt } = relay();
    const { host, shown, release } = collection(environment);
    host.refresh();
    fetchAt(0).respond();
    host.refresh();
    fetchAt(1).fail(new Error("timeout"));
    expect(shown()).toMatchObject({
      ids: ["m1", "m2"],
      status: "refreshFailed",
      matches: true,
      problem: { status: "failed", failure: { reason: "timeout" } },
    });
    release();
  });

  it("releases everything when the scope rotates", () => {
    const { environment, fetchAt } = relay();
    const { released, wrapped } = counted(environment);
    const host = createDataViewsProvider({
      schema,
      capabilities: connectionCapabilities,
      window: paged(),
    });
    const release = createSourceBinding({
      host,
      source: source(wrapped),
    }).observe();
    host.refresh();
    host.rotateScope();
    expect(released).toEqual({ retentions: 1, subscriptions: 1, fetches: 1 });
    expect(fetchAt(0).cancelled).toBe(true);
    expect(host.state.get().result.status).toBe("idle");
    release();
  });

  it("releases everything when the observation ends or the provider is disposed", () => {
    const { environment, fetchAt } = relay();
    const detaching = counted(environment);
    const host = createDataViewsProvider({
      schema,
      capabilities: connectionCapabilities,
      window: paged(),
    });
    const release = createSourceBinding({
      host,
      source: source(detaching.wrapped),
    }).observe();
    host.refresh();
    release();
    expect(detaching.released).toEqual({
      retentions: 1,
      subscriptions: 1,
      fetches: 1,
    });

    const ending = counted(environment);
    const other = createDataViewsProvider({
      schema,
      capabilities: connectionCapabilities,
      window: paged(),
    });
    createSourceBinding({
      host: other,
      source: source(ending.wrapped),
    }).observe();
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
