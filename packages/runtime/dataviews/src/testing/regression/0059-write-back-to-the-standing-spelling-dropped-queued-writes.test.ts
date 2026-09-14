/**
 * Regression: a queued write back to where the location stands keeps the
 * writes queued before it.
 *
 * Before the fix, the loop took any write the location read back at once as
 * landed, and every write before it with it. Behind a router applying writes
 * late, setting a filter and clearing it again wrote the spelling the
 * location still stood at: the filter's queued write was forgotten, and when
 * the router applied it the host adopted the filter and dropped it again,
 * publishing and requesting twice.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { answering, byId, declare } from "../../../testing/fixtures.js";
import observeUntilFinished from "../../../testing/observeUntilFinished.js";
import { createCollection } from "../../lib/collection/index.js";
import {
  createMemoryLocation,
  type QueryLocation,
} from "../../lib/location/index.js";
import {
  createDataViewsProvider,
  readProviderHost,
} from "../../lib/provider/index.js";

const collection = createCollection({
  identify: byId,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "running"] },
  ],
});

describe("regression 0059 — a write back to the standing spelling dropped queued writes", () => {
  it("lands a filter set and cleared again without adopting either", () => {
    const memory = createMemoryLocation({ href: "/machines?page=1&size=50" });
    const pending: URLSearchParams[] = [];
    const location: QueryLocation = {
      ...memory,
      write(next) {
        pending.push(next);
      },
    };
    const provider = createDataViewsProvider({
      collection,
      source: createManualSource({
        capabilities: declare({ filter: { status: ["eq"] } }),
        answer: answering([]),
      }).source,
      location,
    });
    observeUntilFinished(provider);
    const host = readProviderHost(provider);
    host.setPredicate({
      field: "status",
      operator: "eq",
      operands: ["failed"],
    });
    host.removePredicate("status", "eq");
    expect(pending).toHaveLength(2);
    let published = 0;
    provider.state.subscribe(() => {
      published += 1;
    });
    for (const next of pending.splice(0)) {
      memory.write(next);
    }
    expect(published).toBe(0);
    expect(provider.state.get().slice.filter).toEqual([]);
    expect(memory.read().toString()).toBe("page=1&size=50");
  });
});
