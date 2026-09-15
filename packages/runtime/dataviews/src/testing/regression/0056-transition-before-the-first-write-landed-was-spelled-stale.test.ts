/**
 * Regression: a transition made before the first pass's write lands is
 * spelled from where that write leaves the location.
 *
 * Before the fix, while the first pass's write had not landed the loop read
 * the location as it stood before the pass. Removing a filter then matched
 * that empty location, so nothing was written, and the late write — ignored
 * as the loop's own echo — left the location carrying a filter the host no
 * longer applied. Writes landing out of order left the two apart as well.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { answering, byId, declare } from "../../../testing/fixtures.js";
import observeUntilFinished from "../../../testing/observeUntilFinished.js";
import { createCollection } from "../../lib/collection/index.js";
import {
  createMemoryLocation,
  type HistoryMode,
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

/**
 * A provider started from a snapshot filtering by status, over a location at
 * `/machines` whose writes wait in `pending` until landed.
 */
const buildLagging = () => {
  const memory = createMemoryLocation({ href: "/machines" });
  const pending: URLSearchParams[] = [];
  const histories: (HistoryMode | undefined)[] = [];
  const location: QueryLocation = {
    ...memory,
    write(next, options) {
      pending.push(next);
      histories.push(options?.history);
    },
  };
  const provider = createDataViewsProvider({
    collection,
    source: createManualSource({
      capabilities: declare({ filter: { status: ["isAny"] } }),
      answer: answering([]),
    }).source,
    location,
    snapshot: { query: "status=failed", presentation: {} },
  });
  return {
    memory,
    pending,
    histories,
    provider,
    host: readProviderHost(provider),
    readFilter: () =>
      provider.state.get().slice.filter.map(({ operands }) => operands),
  };
};

describe("regression 0056 — a transition before the first write landed was spelled stale", () => {
  it("writes a removed filter out of the location the first write leaves", () => {
    const { memory, pending, histories, provider, host, readFilter } =
      buildLagging();
    observeUntilFinished(provider);
    host.removePredicate("status", "isAny");
    // A step the reader took: it enters history as a filter change does.
    expect(histories.at(-1)).toBe("push");
    for (const next of pending.splice(0)) {
      memory.write(next);
    }
    expect(readFilter()).toEqual([]);
    expect(memory.read().toString()).toBe("page=1&size=50");
  });

  it("takes up where the location ends when writes land out of order", () => {
    const { memory, pending, provider, host, readFilter } = buildLagging();
    observeUntilFinished(provider);
    host.setPredicate({
      field: "status",
      operator: "isAny",
      operands: ["running"],
    });
    for (const next of pending.splice(0).reverse()) {
      memory.write(next);
    }
    expect(memory.read().get("status")).toBe("failed");
    expect(readFilter()).toEqual([["failed"]]);
  });
});
