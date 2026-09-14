/**
 * Regression: an observation made again before a write lands keeps awaiting
 * it.
 *
 * Before the fix, every observation forgot the writes the loop was awaiting.
 * A StrictMode mount observes, releases and observes again before a router
 * applying navigation later has applied anything: the second observation
 * wrote the first one's spelling again or adopted the location it had
 * written over, and each late landing then arrived as a move — dropping
 * what a snapshot's query was refused for, or adopting a query a reset had
 * left.
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
import type { Predicate } from "../../lib/query/index.js";
import type { DataViewsSnapshot } from "../../lib/snapshot/index.js";

const collection = createCollection({
  identify: byId,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "running"] },
    { field: "owner", kind: "flag" },
  ],
});

/** A provider over a location at `href` whose writes wait in `pending`. */
const buildLagging = (href: string, snapshot?: DataViewsSnapshot) => {
  const memory = createMemoryLocation({ href });
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
    snapshot,
  });
  return {
    memory,
    pending,
    provider,
    landAll: () => {
      for (const next of pending.splice(0)) {
        memory.write(next);
      }
    },
  };
};

describe("regression 0060 — observing again forgot a write in flight", () => {
  it("writes once, and keeps reporting the snapshot's refusals when it lands", () => {
    const { pending, provider, landAll } = buildLagging("/machines", {
      query: "status=failed&owner__isSet=1",
      presentation: {},
    });
    const release = provider.observe();
    release();
    observeUntilFinished(provider);
    expect(pending).toHaveLength(1);
    landAll();
    expect(provider.issues.get().map(({ parameter }) => parameter)).toEqual([
      "owner__isSet",
    ]);
  });

  it("keeps a reset made before observing, adopting nothing it wrote over", () => {
    const { memory, provider, landAll } = buildLagging(
      "/machines?status=running",
    );
    provider.reset();
    const filters: (readonly Predicate[])[] = [];
    const stop = provider.state.subscribe(() => {
      filters.push(provider.state.get().slice.filter);
    });
    const release = provider.observe();
    release();
    observeUntilFinished(provider);
    landAll();
    stop();
    expect(filters.flat().flatMap(({ operands }) => operands)).not.toContain(
      "running",
    );
    expect(provider.state.get().slice.filter).toEqual([]);
    expect(memory.read().toString()).toBe("page=1&size=50");
  });
});
