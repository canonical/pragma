/**
 * `contains` means one thing wherever it is executed: every case of the one
 * fixture table, run through each executor that claims the operator — the
 * local array source.
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
import type { ContainsRecord } from "../../../testing/types.js";

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

describe("contains means one thing", () => {
  for (const { operand, matches, pins } of CONTAINS_CASES) {
    describe(`${JSON.stringify(operand)}: ${pins}`, () => {
      it("in the array source", () => {
        expect(findInArraySource(operand)).toEqual(matches);
      });
    });
  }
});
