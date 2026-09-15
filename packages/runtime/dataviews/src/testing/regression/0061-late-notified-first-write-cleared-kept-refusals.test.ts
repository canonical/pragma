/**
 * Regression: a first-pass write a location shows at once but notifies of
 * later is still the loop's own echo.
 *
 * Before the fix, the loop took a write the location already showed when it
 * subscribed as landed, and awaited it no more. A hash router shows a write
 * at once and notifies of it on the next event: that notification then read
 * as the reader's move, and what the snapshot's query was refused for stopped
 * being reported while the host still stood on the narrowed query.
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
import { createDataViewsProvider } from "../../lib/provider/index.js";

const collection = createCollection({
  identify: byId,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "running"] },
    { field: "owner", kind: "flag" },
  ],
});

/**
 * A provider started from a refused snapshot over a location that shows a
 * write at once and notifies of it in a later task.
 */
const buildLateNotifying = () => {
  const memory = createMemoryLocation({ href: "/machines" });
  const listeners = new Set<() => void>();
  let delivered = 0;
  const location: QueryLocation = {
    read: memory.read,
    write(next, options) {
      memory.write(next, options);
      queueMicrotask(() => {
        for (const listener of listeners) {
          delivered += 1;
          listener();
        }
      });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  const provider = createDataViewsProvider({
    collection,
    source: createManualSource({
      capabilities: declare({ filter: { status: ["isAny"] } }),
      answer: answering([]),
    }).source,
    location,
    snapshot: { query: "status=failed&owner__isSet=1", presentation: {} },
  });
  return {
    provider,
    readRefused: () => provider.issues.get().map(({ parameter }) => parameter),
    readDelivered: () => delivered,
  };
};

describe("regression 0061 — a late-notified first write cleared kept refusals", () => {
  it("keeps reporting the snapshot's refusals when the notification arrives", async () => {
    const { provider, readRefused, readDelivered } = buildLateNotifying();
    observeUntilFinished(provider);
    expect(readRefused()).toEqual(["owner__isSet"]);
    await Promise.resolve();
    expect(readDelivered()).toBeGreaterThan(0);
    expect(readRefused()).toEqual(["owner__isSet"]);
  });

  it("keeps reporting them across a release and an observation made again before it arrives", async () => {
    const { provider, readRefused, readDelivered } = buildLateNotifying();
    const release = provider.observe();
    release();
    observeUntilFinished(provider);
    await Promise.resolve();
    expect(readDelivered()).toBeGreaterThan(0);
    expect(readRefused()).toEqual(["owner__isSet"]);
  });
});
