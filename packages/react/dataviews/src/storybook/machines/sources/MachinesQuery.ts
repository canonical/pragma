import type { ConcreteRequest } from "relay-runtime";
import { MACHINES_QUERY_TEXT, MACHINES_QUERY_VARIABLES } from "../api/index.js";

/** A scalar selection, as the Relay compiler writes one. */
const selectScalar = (name: string) => ({
  alias: null,
  args: null,
  kind: "ScalarField",
  name,
  storageKey: null,
});

/** A linked selection, as the Relay compiler writes one. */
const selectLinked = (
  name: string,
  concreteType: string,
  selections: readonly unknown[],
  { plural = false, args = null }: { plural?: boolean; args?: unknown } = {},
) => ({
  alias: null,
  args,
  concreteType,
  kind: "LinkedField",
  name,
  plural,
  selections,
  storageKey: null,
});

const argumentDefinitions = MACHINES_QUERY_VARIABLES.map((name) => ({
  defaultValue: null,
  kind: "LocalArgument",
  name,
}));

const machines = selectLinked(
  "machines",
  "MachineConnection",
  [
    selectScalar("totalCount"),
    selectLinked("pageInfo", "PageInfo", [
      selectScalar("endCursor"),
      selectScalar("hasNextPage"),
    ]),
    selectLinked(
      "edges",
      "MachineEdge",
      [
        selectScalar("cursor"),
        selectLinked(
          "node",
          "Machine",
          ["id", "name", "status", "cores", "region", "owner"].map(
            selectScalar,
          ),
        ),
      ],
      { plural: true },
    ),
  ],
  {
    args: MACHINES_QUERY_VARIABLES.map((name) => ({
      kind: "Variable",
      name,
      variableName: name,
    })),
  },
);

/**
 * The compiled `MachinesQuery`, as `relay-compiler` would emit it for the
 * query text the GraphQL endpoint answers: written out here so the stories
 * need no compiler step. It pages by its own `first` and `after` rather than
 * through `@connection`, which would merge its pages.
 */
const MachinesQuery = {
  kind: "Request",
  fragment: {
    argumentDefinitions,
    kind: "Fragment",
    metadata: null,
    name: "MachinesQuery",
    selections: [machines],
    type: "Query",
    abstractKey: null,
  },
  operation: {
    argumentDefinitions,
    kind: "Operation",
    name: "MachinesQuery",
    selections: [machines],
  },
  params: {
    cacheID: "MachinesQuery",
    id: null,
    metadata: {},
    name: "MachinesQuery",
    operationKind: "query",
    text: MACHINES_QUERY_TEXT,
  },
} as unknown as ConcreteRequest;

export default MachinesQuery;
