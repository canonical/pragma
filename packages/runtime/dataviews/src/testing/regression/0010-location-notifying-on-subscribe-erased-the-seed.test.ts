/**
 * Regression: a location that notifies its listener on subscribe must not
 * adopt itself over the seed.
 *
 * Before the fix, the loop subscribed to the location before its first
 * pass; an adapter calling the listener at once made the loop adopt the
 * empty location, so the seed's query was gone before the pass that would
 * have written it ran.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { byId, declare } from "../../../testing/fixtures.js";
import { createCollection } from "../../lib/collection/index.js";
import {
  createMemoryLocation,
  type QueryLocation,
} from "../../lib/location/index.js";
import { createDataViewsProvider } from "../../lib/provider/index.js";
import { EMPTY_SLICE } from "../../lib/query/index.js";

const machines = createCollection({
  identify: byId,
  fields: [{ field: "status", kind: "choices", options: ["failed"] }],
});

/** A location whose subscription calls the listener at once, as some adapters do. */
const notifyingOnSubscribe = (href: string): QueryLocation => {
  const memory = createMemoryLocation({ href });
  return {
    ...memory,
    subscribe(listener) {
      const stop = memory.subscribe(listener);
      listener();
      return stop;
    },
  };
};

describe("regression 0010 — a location notifying on subscribe keeps the seed", () => {
  it("writes the seed and adopts nothing from the notification", () => {
    const location = notifyingOnSubscribe("/machines");
    const provider = createDataViewsProvider({
      collection: machines,
      source: createManualSource({
        capabilities: declare({ filter: { status: ["eq"] } }),
      }).source,
      location,
      seed: {
        slice: {
          ...EMPTY_SLICE,
          filter: [{ field: "status", operator: "eq", operands: ["failed"] }],
        },
      },
    });
    const release = provider.observe();
    expect(provider.state.get().slice.filter).toEqual([
      { field: "status", operator: "eq", operands: ["failed"] },
    ]);
    expect(location.read().getAll("status")).toEqual(["failed"]);
    release();
  });
});
