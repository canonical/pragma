import {
  createRelaySource,
  declareCapabilities,
  type RelaySourceConfig,
  readSlice,
  type Source,
} from "@canonical/dataviews-core";
import {
  createOperationDescriptor,
  Environment,
  type GraphQLSingularResponse,
  Network,
  RecordSource,
  Store,
} from "relay-runtime";
import type { ApiScenario } from "../api/index.js";
import { type Machine, machineCollection } from "../fixtures.js";
import MachinesQuery from "./MachinesQuery.js";

/**
 * What the GraphQL endpoint executes, and so all the parts may offer: the
 * statuses a machine is any or none of, bounds on cores, text the name, the
 * region and the owner contain, text the name and the owner — but not the
 * region — start with, search over the name and the owner, one ordered term,
 * and forward pages by cursor with no counts at all.
 */
const GRAPHQL_CAPABILITIES = declareCapabilities(machineCollection, {
  filter: {
    status: ["isAny", "isNone"],
    cores: ["gte", "lte"],
    name: ["contains", "startsWith"],
    region: ["contains"],
    owner: ["contains", "startsWith"],
  },
  search: ["name", "owner"],
  sort: {
    fields: ["name", "status", "cores", "region", "owner"],
    terms: 1,
    tiebreak: "opaque",
  },
  pagination: { kind: "cursor", backward: false, durable: false },
});

/** The filter input of a GraphQL `machines` query. */
type MachineWhere = {
  readonly status?: readonly string[] | null | undefined;
  readonly statusIsNone?: readonly string[] | null | undefined;
  readonly coresGte?: number | null | undefined;
  readonly coresLte?: number | null | undefined;
  readonly nameContains?: string | null | undefined;
  readonly nameStartsWith?: string | null | undefined;
  readonly regionContains?: string | null | undefined;
  readonly ownerContains?: string | null | undefined;
  readonly ownerStartsWith?: string | null | undefined;
  readonly search?: string | null | undefined;
};

/** One ordered term of a GraphQL `orderBy`. */
type MachineOrder = {
  readonly field: string;
  readonly direction: "ASC" | "DESC";
};

/** The variables of the GraphQL `MachinesQuery`. */
type MachinesVariables = {
  readonly first: number;
  readonly after: string | null;
  readonly where: MachineWhere | null;
  readonly orderBy: readonly MachineOrder[] | null;
};

/** The compiled query's type, as the Relay compiler generates it. */
type MachinesOperation = {
  readonly response: {
    readonly machines: {
      readonly totalCount: number | null;
      readonly pageInfo: {
        readonly endCursor: string | null;
        readonly hasNextPage: boolean;
      };
      readonly edges: readonly { readonly node: Machine }[];
    };
  };
  readonly variables: MachinesVariables;
};

/** The page one operation is built for. */
type PageRequest = Parameters<
  RelaySourceConfig<MachinesOperation, Machine>["operation"]
>[0];

/** One page's variables, read from the query by field. */
const readVariables = ({
  slice,
  first,
  after,
}: PageRequest): MachinesVariables => {
  const { filters, search, sort } = readSlice(machineCollection, slice);
  return {
    first,
    after,
    where: {
      status:
        filters.status?.isAny === undefined ? null : [...filters.status.isAny],
      statusIsNone:
        filters.status?.isNone === undefined
          ? null
          : [...filters.status.isNone],
      coresGte: filters.cores?.gte ?? null,
      coresLte: filters.cores?.lte ?? null,
      nameContains: filters.name?.contains ?? null,
      nameStartsWith: filters.name?.startsWith ?? null,
      regionContains: filters.region?.contains ?? null,
      ownerContains: filters.owner?.contains ?? null,
      ownerStartsWith: filters.owner?.startsWith ?? null,
      search,
    },
    orderBy: sort.map(({ field, direction }) => ({
      field,
      direction: direction === "asc" ? "ASC" : "DESC",
    })),
  };
};

/**
 * The network one scenario's operations are sent through. The answer is
 * read, never trusted. One whose data holds something is passed on with any
 * errors beside it, as the partial answer it is, and Relay stores what it
 * holds. One that is not a JSON object, or whose data holds nothing, fails
 * the fetch in the endpoint's own words — its first error's message, its
 * status, or a sentence of its own — rather than in Relay's.
 *
 * @note Impure: the network it returns sends requests.
 */
const createMachinesNetwork = (scenario: ApiScenario) =>
  Network.create(async (request, variables) => {
    const response = await fetch(
      new URL(`/graphql/${scenario}`, globalThis.location.href),
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query: request.text,
          operationName: request.name,
          variables,
        }),
      },
    );
    // A status text is empty over HTTP/2, so the status stands in for it.
    const statusReason =
      response.statusText || `the endpoint answered ${response.status}`;
    const body: unknown = await response.json().catch(() => null);
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new Error(
        response.ok
          ? "the endpoint answered without a JSON object"
          : statusReason,
      );
    }
    const data = "data" in body ? body.data : undefined;
    // Data that holds nothing — a failed nullable root field is answered as
    // null beside its error — is no page, so it fails like no data at all.
    if (
      typeof data === "object" &&
      data !== null &&
      Object.values(data).some((value) => value !== null && value !== undefined)
    ) {
      return body as GraphQLSingularResponse;
    }
    const errors = "errors" in body ? body.errors : undefined;
    const [error]: readonly unknown[] = Array.isArray(errors) ? errors : [];
    if (error !== undefined) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? error.message
          : undefined;
      throw new Error(
        typeof message === "string"
          ? message
          : "the endpoint answered with an error it did not describe",
      );
    }
    throw new Error(
      response.ok ? "the endpoint answered without data" : statusReason,
    );
  });

/**
 * A source over the GraphQL machine endpoint of one scenario, through a
 * Relay environment of its own: Relay's store is the only cache.
 *
 * @note Impure: the source it returns sends requests.
 */
export default function createGraphQLMachineSource(
  scenario: ApiScenario,
): Source<Machine> {
  const environment = new Environment({
    network: createMachinesNetwork(scenario),
    store: new Store(new RecordSource()),
  });
  return createRelaySource<MachinesOperation, Machine>({
    capabilities: GRAPHQL_CAPABILITIES,
    environment,
    operation: (page) =>
      createOperationDescriptor(MachinesQuery, readVariables(page)),
    connection: (data) => data.machines,
  });
}
