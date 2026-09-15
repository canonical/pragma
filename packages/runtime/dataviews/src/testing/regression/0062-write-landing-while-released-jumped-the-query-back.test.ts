/**
 * Regression: a queued write that lands while nothing observes is taken up as
 * landed, and the writes after it stay awaited.
 *
 * Before the fix, an observation starting over a location that had moved
 * since the last release forgot every awaited write. A route remounted while
 * a router was still applying queued writes found the location on an older
 * one: the host adopted it and requested it, then adopted and requested the
 * newest again as it landed — a flash back to a query the reader had left.
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
import type { Predicate } from "../../lib/query/index.js";

const collection = createCollection({
  identify: byId,
  fields: [
    {
      field: "status",
      kind: "choices",
      options: ["failed", "running", "ready"],
    },
  ],
});

/**
 * A provider over a location at its first page whose writes wait in `pending`
 * until landed, with the operands of every filter it publishes recorded once
 * `record` starts.
 */
const buildQueued = () => {
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
      capabilities: declare({ filter: { status: ["isAny"] } }),
      answer: answering([]),
    }).source,
    location,
  });
  const host = readProviderHost(provider);
  const operands: Predicate["operands"][number][] = [];
  return {
    memory,
    pending,
    provider,
    operands,
    filterBy: (status: string) => {
      host.setPredicate({
        field: "status",
        operator: "isAny",
        operands: [status],
      });
    },
    record: () =>
      provider.state.subscribe(() => {
        operands.push(
          ...provider.state
            .get()
            .slice.filter.flatMap(({ operands }) => operands),
        );
      }),
  };
};

describe("regression 0062 — a write landing while released jumped the query back", () => {
  it("adopts nothing older than the newest write when observed again", () => {
    const { memory, pending, provider, operands, filterBy, record } =
      buildQueued();
    const release = provider.observe();
    filterBy("failed");
    filterBy("running");
    release();
    // The router applies the older write while nothing observes.
    const older = pending.shift();
    if (older !== undefined) {
      memory.write(older);
    }
    const stop = record();
    observeUntilFinished(provider);
    for (const next of pending.splice(0)) {
      memory.write(next);
    }
    stop();
    expect(operands).not.toContain("failed");
    expect(memory.read().get("status")).toBe("running");
  });

  it("adopts nothing older when every queued write landed while released", () => {
    const { memory, pending, provider, operands, filterBy, record } =
      buildQueued();
    const release = provider.observe();
    filterBy("failed");
    filterBy("running");
    release();
    for (const next of pending.splice(0)) {
      memory.write(next);
    }
    const stop = record();
    observeUntilFinished(provider);
    stop();
    expect(operands).not.toContain("failed");
    expect(
      provider.state.get().slice.filter.flatMap(({ operands }) => operands),
    ).toEqual(["running"]);
  });

  it("takes up the writes that landed while released, and awaits the rest", () => {
    const { memory, pending, provider, operands, filterBy, record } =
      buildQueued();
    const release = provider.observe();
    filterBy("failed");
    filterBy("running");
    filterBy("ready");
    release();
    // The router applies the two older writes while nothing observes.
    for (const next of pending.splice(0, 2)) {
      memory.write(next);
    }
    const stop = record();
    observeUntilFinished(provider);
    for (const next of pending.splice(0)) {
      memory.write(next);
    }
    stop();
    expect(operands).not.toContain("failed");
    expect(operands).not.toContain("running");
    expect(memory.read().get("status")).toBe("ready");
  });
});
