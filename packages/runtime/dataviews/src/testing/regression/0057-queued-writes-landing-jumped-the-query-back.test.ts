/**
 * Regression: writes queued behind a router applying them late land as the
 * loop's own echoes.
 *
 * Before the fix, the loop awaited only the newest spelling it had written.
 * Changing the filter several times before any write landed left each older
 * write to arrive as a move: the host adopted every intermediate query on
 * its way back to the newest, re-rendering and re-requesting each one.
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

/**
 * An observed provider over a location standing at its canonical first page,
 * whose writes wait in `pending` until landed; `filterBy` issues one status
 * filter after another.
 */
const buildLagging = () => {
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
  return {
    memory,
    pending,
    provider,
    filterBy: (statuses: readonly string[]) => {
      for (const status of statuses) {
        host.setPredicate({
          field: "status",
          operator: "isAny",
          operands: [status],
        });
      }
    },
    landAll: () => {
      for (const next of pending.splice(0)) {
        memory.write(next);
      }
    },
  };
};

describe("regression 0057 — queued writes landing jumped the query back", () => {
  it("lands each queued write without adopting an older query", () => {
    const { pending, provider, filterBy, landAll } = buildLagging();
    filterBy(["failed", "running", "ready"]);
    expect(pending).toHaveLength(3);
    let published = 0;
    provider.state.subscribe(() => {
      published += 1;
    });
    landAll();
    expect(published).toBe(0);
    expect(provider.state.get().slice.filter).toEqual([
      { field: "status", operator: "isAny", operands: ["ready"] },
    ]);
  });

  it("spells a filter toggled back from the newest queued write", () => {
    const { memory, pending, provider, filterBy, landAll } = buildLagging();
    filterBy(["failed", "running", "failed"]);
    expect(pending).toHaveLength(3);
    landAll();
    expect(memory.read().get("status")).toBe("failed");
    expect(provider.state.get().slice.filter).toEqual([
      { field: "status", operator: "isAny", operands: ["failed"] },
    ]);
  });
});
