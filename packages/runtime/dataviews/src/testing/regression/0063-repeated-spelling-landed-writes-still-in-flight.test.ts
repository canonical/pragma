/**
 * Regression: a write made while the location stands at a spelling queued
 * twice keeps the writes still in flight awaited.
 *
 * Before the fix, a write took every awaited write up to the last copy of
 * the spelling the location stood at as landed. Toggling a filter on, off
 * and on again queued that spelling twice behind a router applying writes
 * late; once the first copy landed, the next write dropped the copy and the
 * write between them, both still in flight, and each arrived as a move — the
 * filter flashing back as the router caught up.
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
    {
      field: "status",
      kind: "choices",
      options: ["failed", "running", "ready"],
    },
  ],
});

describe("regression 0063 — a repeated spelling landed writes still in flight", () => {
  it("lands a filter toggled back and moved on without adopting anything older", () => {
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
    observeUntilFinished(provider);
    const host = readProviderHost(provider);
    const filterBy = (status: string) => {
      host.setPredicate({
        field: "status",
        operator: "isAny",
        operands: [status],
      });
    };
    filterBy("failed");
    filterBy("running");
    filterBy("failed");
    // The router applies the first write.
    const first = pending.shift();
    if (first !== undefined) {
      memory.write(first);
    }
    filterBy("ready");
    let published = 0;
    const stop = provider.state.subscribe(() => {
      published += 1;
    });
    for (const next of pending.splice(0)) {
      memory.write(next);
    }
    stop();
    expect(published).toBe(0);
    expect(memory.read().get("status")).toBe("ready");
  });
});
