/**
 * A facet means one thing wherever it is computed: each case of the one
 * fixture table, run through each executor that declares facets — the local
 * array source, the REST endpoint and the GraphQL endpoint — each asked for
 * the status and the cores facets together.
 */

import {
  createArraySource,
  createCollection,
  DEFAULT_WINDOW,
  EMPTY_SLICE,
  type Facet,
  type Predicate,
  type SourceDelivery,
} from "@canonical/dataviews-core";
import { describe, expect, it } from "vitest";
import { FACET_CASES, FACET_RECORDS } from "../../../testing/fixtures.js";
import {
  requestGraphQL,
  requestRest,
} from "../../../testing/requestMockApi.js";
import serveMockApi from "../../../testing/serveMockApi.js";
import type { FacetCase, FacetRecord } from "../../../testing/types.js";
import {
  createGraphQLHandlers,
  createRestHandlers,
  type MachinesData,
} from "../../storybook/machines/api/index.js";

serveMockApi([
  ...createRestHandlers({ records: FACET_RECORDS }),
  ...createGraphQLHandlers({ records: FACET_RECORDS }),
]);

const records = createCollection({
  identify: (record: FacetRecord) => record.id,
  fields: [
    { field: "name", kind: "text" },
    {
      field: "status",
      kind: "choices",
      options: ["running", "failed", "pending"],
    },
    { field: "cores", kind: "number" },
  ],
});

/** The facets every executor is asked for. */
const FACETS = ["status", "cores"];

/** The facets a case answers, in the envelope's own shape. */
const buildExpectedFacets = ({ status, cores: [min, max] }: FacetCase) => ({
  status: {
    kind: "values",
    values: status.map(([value, count]) => ({
      value,
      count: { kind: "exact", value: count },
    })),
  },
  cores: { kind: "range", min, max },
});

/** A case's query as the predicates a slice carries. */
const buildFilter = ({ query }: FacetCase): readonly Predicate[] => [
  ...(query.isAny === undefined
    ? []
    : [{ field: "status", operator: "isAny" as const, operands: query.isAny }]),
  ...(query.isNone === undefined
    ? []
    : [
        {
          field: "status",
          operator: "isNone" as const,
          operands: query.isNone,
        },
      ]),
  ...(query.gte === undefined
    ? []
    : [{ field: "cores", operator: "gte" as const, operands: [query.gte] }]),
  ...(query.lte === undefined
    ? []
    : [{ field: "cores", operator: "lte" as const, operands: [query.lte] }]),
];

/** Compute one case's facets in the local array source. */
const readFacetsInArraySource = (tested: FacetCase): unknown => {
  const source = createArraySource({
    rows: FACET_RECORDS,
    collection: records,
    // What either endpoint's search reads.
    searchFields: ["name", "owner"],
  });
  const deliveries: SourceDelivery<FacetRecord>[] = [];
  source.execute(
    {
      requestId: "facets",
      slice: {
        ...EMPTY_SLICE,
        filter: buildFilter(tested),
        search: tested.query.search ?? null,
      },
      // One record a page: only the whole matching set can answer.
      window: { ...DEFAULT_WINDOW, size: 1 },
      facets: FACETS,
    },
    (delivery) => {
      deliveries.push(delivery);
    },
  )();
  const answer = deliveries.at(-1);
  return answer?.status === "succeeded" ? answer.page.facets : answer;
};

/** Compute one case's facets at the REST endpoint. */
const readFacetsOverRest = async ({ query }: FacetCase): Promise<unknown> => {
  // One record a page: only the whole matching set can answer.
  const params = new URLSearchParams({ size: "1" });
  for (const status of query.isAny ?? []) {
    params.append("status", status);
  }
  for (const status of query.isNone ?? []) {
    params.append("status__isNone", status);
  }
  if (query.gte !== undefined) {
    params.set("cores__gte", String(query.gte));
  }
  if (query.lte !== undefined) {
    params.set("cores__lte", String(query.lte));
  }
  if (query.search !== undefined) {
    params.set("q", query.search);
  }
  for (const field of FACETS) {
    params.append("facet", field);
  }
  const { body } = await requestRest("live", params.toString());
  const { facets } = body as { readonly facets?: Record<string, Facet> };
  return facets ?? body;
};

/** Compute one case's facets at the GraphQL endpoint. */
const readFacetsOverGraphQL = async ({
  query,
}: FacetCase): Promise<unknown> => {
  const { body } = await requestGraphQL("live", {
    first: 1,
    where: {
      status: query.isAny ?? null,
      statusIsNone: query.isNone ?? null,
      coresGte: query.gte ?? null,
      coresLte: query.lte ?? null,
      search: query.search ?? null,
    },
    facets: FACETS,
  });
  const { data } = body as { readonly data?: MachinesData };
  return data?.machines.facets ?? body;
};

describe("facets mean one thing", () => {
  for (const tested of FACET_CASES) {
    describe(`${JSON.stringify(tested.query)}: ${tested.pins}`, () => {
      it("in the array source", () => {
        expect(readFacetsInArraySource(tested)).toEqual(
          buildExpectedFacets(tested),
        );
      });

      it("at the REST endpoint", async () => {
        expect(await readFacetsOverRest(tested)).toEqual(
          buildExpectedFacets(tested),
        );
      });

      it("at the GraphQL endpoint", async () => {
        expect(await readFacetsOverGraphQL(tested)).toEqual(
          buildExpectedFacets(tested),
        );
      });
    });
  }
});
