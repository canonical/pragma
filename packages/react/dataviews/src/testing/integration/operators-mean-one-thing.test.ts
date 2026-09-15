/**
 * Every filter operator means one thing wherever it is executed: each case
 * of the one fixture table, run through each executor that claims the
 * operator — the local array source, the REST endpoint matching text with an
 * escaped `LIKE` pattern, and the GraphQL endpoint matching it with a
 * substring or prefix test.
 */

import {
  createArraySource,
  createCollection,
  DEFAULT_WINDOW,
  EMPTY_SLICE,
  type SourceDelivery,
} from "@canonical/dataviews-core";
import { describe, expect, it } from "vitest";
import { OPERATOR_CASES, OPERATOR_RECORDS } from "../../../testing/fixtures.js";
import {
  requestGraphQL,
  requestRest,
} from "../../../testing/requestMockApi.js";
import serveMockApi from "../../../testing/serveMockApi.js";
import type { OperatorCase, OperatorRecord } from "../../../testing/types.js";
import {
  createGraphQLHandlers,
  createRestHandlers,
  type MachinesData,
} from "../../storybook/machines/api/index.js";

serveMockApi([
  ...createRestHandlers({ records: OPERATOR_RECORDS }),
  ...createGraphQLHandlers({ records: OPERATOR_RECORDS }),
]);

const records = createCollection({
  identify: (record: OperatorRecord) => record.id,
  fields: [
    { field: "name", kind: "text" },
    {
      field: "status",
      kind: "choices",
      options: ["running", "failed", "pending"],
    },
  ],
});

/** Every record fits on one page, so a page is the whole answer. */
const EVERY_RECORD = OPERATOR_RECORDS.length;

/** The field a case's operator looks at. */
const readCaseField = ({ operator }: OperatorCase): "name" | "status" =>
  operator === "contains" || operator === "startsWith" ? "name" : "status";

/** Run one case through the local array source. */
const findInArraySource = (tested: OperatorCase): unknown => {
  const source = createArraySource({
    rows: OPERATOR_RECORDS,
    collection: records,
  });
  const deliveries: SourceDelivery<OperatorRecord>[] = [];
  source.execute(
    {
      requestId: "operators",
      slice: {
        ...EMPTY_SLICE,
        filter: [
          {
            field: readCaseField(tested),
            operator: tested.operator,
            operands: tested.operands,
          },
        ],
      },
      window: { ...DEFAULT_WINDOW, size: EVERY_RECORD },
      facets: [],
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

/** The REST parameter a case is spelled as, as the wire grammar spells it. */
const REST_KEYS = {
  contains: "name__contains",
  startsWith: "name__startsWith",
  isAny: "status",
  isNone: "status__isNone",
} as const satisfies Readonly<Record<OperatorCase["operator"], string>>;

/** Run one case through the REST endpoint. */
const findOverRest = async (tested: OperatorCase): Promise<unknown> => {
  const params = new URLSearchParams({ size: String(EVERY_RECORD) });
  for (const operand of tested.operands) {
    params.append(REST_KEYS[tested.operator], operand);
  }
  const { body } = await requestRest("live", params.toString());
  const { items } = body as {
    readonly items?: readonly OperatorRecord[];
  };
  return items?.map((record) => record.id) ?? body;
};

/** The `where` member a case is sent in, as the GraphQL endpoint names it. */
const GRAPHQL_MEMBERS = {
  contains: "nameContains",
  startsWith: "nameStartsWith",
  isAny: "status",
  isNone: "statusIsNone",
} as const satisfies Readonly<Record<OperatorCase["operator"], string>>;

/** Run one case through the GraphQL endpoint. */
const findOverGraphQL = async (tested: OperatorCase): Promise<unknown> => {
  const [operand] = tested.operands;
  const isText = readCaseField(tested) === "name";
  const { body } = await requestGraphQL("live", {
    first: EVERY_RECORD,
    where: {
      [GRAPHQL_MEMBERS[tested.operator]]: isText ? operand : tested.operands,
    },
  });
  const { data } = body as { readonly data?: MachinesData };
  return data?.machines.edges.map((edge) => edge.node.id) ?? body;
};

describe("operators mean one thing", () => {
  for (const tested of OPERATOR_CASES) {
    describe(`${tested.operator} ${JSON.stringify(tested.operands)}: ${tested.pins}`, () => {
      it("in the array source", () => {
        expect(findInArraySource(tested)).toEqual(tested.matches);
      });

      it("at the REST endpoint", async () => {
        expect(await findOverRest(tested)).toEqual(tested.matches);
      });

      it("at the GraphQL endpoint", async () => {
        expect(await findOverGraphQL(tested)).toEqual(tested.matches);
      });
    });
  }
});
