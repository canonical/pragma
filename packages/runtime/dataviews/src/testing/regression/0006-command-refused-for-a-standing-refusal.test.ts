/**
 * Regression: a command is refused only for the refusals it incurs.
 *
 * Before the fix, a command was refused whenever the query it produced
 * carried any refusal — including one the query already carried before the
 * command, adopted from a saved view or a link the source cannot run. So
 * with two undeclared restrictions standing, removing either was refused
 * for the other, and the filters, which offer an undeclared restriction for
 * removal alone, could remove only the last one.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { byId, declare } from "../../../testing/fixtures.js";
import { createCollection } from "../../lib/collection/index.js";
import {
  createDataViewsProvider,
  readProviderHost,
} from "../../lib/provider/index.js";
import { DEFAULT_WINDOW, EMPTY_SLICE } from "../../lib/query/index.js";

const machines = createCollection({
  identify: byId,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "ready"] },
    { field: "cpu", kind: "number" },
  ],
});

describe("regression 0006 — a command is refused only for what it incurs", () => {
  it("removes one refused restriction while another stands, and still refuses a new one", () => {
    const provider = createDataViewsProvider({
      collection: machines,
      // Nothing declared: every restriction is one the source refuses.
      source: createManualSource({ capabilities: declare({}) }).source,
    });
    const host = readProviderHost(provider);
    host.adopt({
      slice: {
        ...EMPTY_SLICE,
        filter: [
          { field: "status", operator: "eq", operands: ["failed"] },
          { field: "cpu", operator: "gte", operands: [4] },
        ],
      },
      window: DEFAULT_WINDOW,
    });
    expect(host.removePredicate("status", "eq")).toEqual([]);
    expect(provider.state.get().slice.filter).toEqual([
      { field: "cpu", operator: "gte", operands: [4] },
    ]);
    // A command adding to the query's trouble is still refused, for the
    // clause it adds and not for the one already standing.
    expect(
      provider
        .setSort([{ field: "cpu", direction: "asc" }])
        .map((refusal) => refusal.part),
    ).toEqual(["sort"]);
    expect(provider.state.get().slice.sort).toEqual([]);
  });
});
