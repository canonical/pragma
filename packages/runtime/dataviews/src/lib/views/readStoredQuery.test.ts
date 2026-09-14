import { describe, expect, it } from "vitest";
import { buildStoredView, byId, declare } from "../../../testing/fixtures.js";
import { createCollection } from "../collection/index.js";
import readStoredQuery from "./readStoredQuery.js";
import type { SavedView } from "./types.js";

const collection = createCollection({
  fields: [
    { field: "status", kind: "choices", options: ["failed", "running"] },
  ],
  identify: byId,
});

const host = {
  schema: collection.schema,
  capabilities: declare({ filter: { status: ["eq"] } }),
};

const buildStored = (query: string): SavedView => buildStoredView({ query });

describe("readStoredQuery", () => {
  it("reads a stored query as the collection's slice, whatever renderer it names", () => {
    const { slice, issues } = readStoredQuery(
      buildStored("as=list&status=failed"),
      host,
    );
    expect(slice.filter).toEqual([
      { field: "status", operator: "eq", operands: ["failed"] },
    ]);
    expect(issues).toEqual([]);
  });

  it("refuses a clause the source cannot run and a parameter naming no field", () => {
    const { issues } = readStoredQuery(
      buildStored("as=table&status=failed&region=eu&q=alder"),
      host,
    );
    expect(issues).toEqual([
      {
        parameter: "q",
        code: "undeclared-field",
        reason: "this source cannot search",
      },
      {
        parameter: "region",
        code: "unknown-field",
        reason: '"region" names no field of this collection',
      },
    ]);
  });
});
