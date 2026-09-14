/**
 * Regression: an observation ends over a location whose writes land late.
 *
 * Before the fix, the first pass read the location again until it carried
 * the spelling the pass had written. A location whose write lands after the
 * call — a router applying a navigation later — never did, and observing
 * the provider never returned.
 */

import { describe, expect, it, onTestFinished, vi } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { answering, byId, declare } from "../../../testing/fixtures.js";
import { createCollection } from "../../lib/collection/index.js";
import {
  createMemoryLocation,
  type QueryLocation,
} from "../../lib/location/index.js";
import { createDataViewsProvider } from "../../lib/provider/index.js";

const collection = createCollection({
  identify: byId,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "running"] },
  ],
});

describe("regression 0050 — a lagging location hung the first pass", () => {
  it("returns from observing when a write has not landed", () => {
    const memory = createMemoryLocation({ href: "/machines" });
    // Writes are taken and land later: never, within this test.
    const write = vi.fn();
    const location: QueryLocation = { ...memory, write };
    const provider = createDataViewsProvider({
      collection,
      source: createManualSource({
        capabilities: declare({ filter: { status: ["eq"] } }),
        answer: answering([]),
      }).source,
      location,
      snapshot: { query: "status=failed", presentation: {} },
    });
    onTestFinished(provider.observe());
    expect(write).toHaveBeenCalled();
    expect(provider.state.get().slice.filter).toEqual([
      { field: "status", operator: "eq", operands: ["failed"] },
    ]);
  });
});
