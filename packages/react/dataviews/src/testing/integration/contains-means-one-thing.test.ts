/**
 * `contains` means one thing wherever it is executed: every case of the one
 * fixture table, run through each executor that claims the operator — the
 * local array source, the REST endpoint matching with an escaped `LIKE`
 * pattern, and the GraphQL endpoint matching with a substring test.
 */

import {
  createArraySource,
  createCollection,
  DEFAULT_WINDOW,
  EMPTY_SLICE,
  type SourceDelivery,
} from "@canonical/dataviews-core";
import { describe, expect, it } from "vitest";
import {
  CONTAINS_CASES,
  CONTAINS_RECORDS,
} from "../../../testing/containsCases.js";
import {
  requestGraphQL,
  requestRest,
} from "../../../testing/requestMockApi.js";
import serveMockApi from "../../../testing/serveMockApi.js";
import type { ContainsRecord } from "../../../testing/types.js";
import {
  createGraphQLHandlers,
  createRestHandlers,
  type MachinesData,
} from "../../storybook/machines/api/index.js";

serveMockApi([
  ...createRestHandlers({ records: CONTAINS_RECORDS }),
  ...createGraphQLHandlers({ records: CONTAINS_RECORDS }),
]);

const records = createCollection({
  identify: (record: ContainsRecord) => record.id,
  fields: [{ field: "name", kind: "text" }],
});

/** Every record fits on one page, so a page is the whole answer. */
const EVERY_RECORD = CONTAINS_RECORDS.length;

/** Run one operand through the local array source. */
const findInArraySource = (operand: string): unknown => {
  const source = createArraySource({
    rows: CONTAINS_RECORDS,
    collection: records,
  });
  const deliveries: SourceDelivery<ContainsRecord>[] = [];
  source.execute(
    {
      requestId: "contains",
      slice: {
        ...EMPTY_SLICE,
        filter: [{ field: "name", operator: "contains", operands: [operand] }],
      },
      window: { ...DEFAULT_WINDOW, size: EVERY_RECORD },
    },
    (delivery) => {
      deliveries.push(delivery);
    },
  )();
  const answer = deliveries.at(-1);
  return answer?.status === "succeeded"
    ? answer.page.rows.map((record) => record.id)
    : answer;
};

/** Run one operand through the REST endpoint. */
const findOverRest = async (operand: string): Promise<unknown> => {
  const params = new URLSearchParams({
    name__contains: operand,
    size: String(EVERY_RECORD),
  });
  const { body } = await requestRest("live", params.toString());
  const { items } = body as {
    readonly items?: readonly ContainsRecord[];
  };
  return items?.map((record) => record.id) ?? body;
};

/** Run one operand through the GraphQL endpoint. */
const findOverGraphQL = async (operand: string): Promise<unknown> => {
  const { body } = await requestGraphQL("live", {
    first: EVERY_RECORD,
    where: { nameContains: operand },
  });
  const { data } = body as { readonly data?: MachinesData };
  return data?.machines.edges.map((edge) => edge.node.id) ?? body;
};

describe("contains means one thing", () => {
  for (const { operand, matches, pins } of CONTAINS_CASES) {
    describe(`${JSON.stringify(operand)}: ${pins}`, () => {
      it("in the array source", () => {
        expect(findInArraySource(operand)).toEqual(matches);
      });

      it("at the REST endpoint", async () => {
        expect(await findOverRest(operand)).toEqual(matches);
      });

      it("at the GraphQL endpoint", async () => {
        expect(await findOverGraphQL(operand)).toEqual(matches);
      });
    });
  }
});
