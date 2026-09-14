/**
 * Regression: a move made within the loop's own write is not overwritten.
 *
 * Before the fix, the loop read back the spelling it had written after every
 * write. A location listener that moved the location within that write had
 * its move adopted first — and then the stale read-back adopted the written
 * spelling over it, leaving the host on a query the location no longer
 * carried.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { answering, byId, declare } from "../../../testing/fixtures.js";
import observeUntilFinished from "../../../testing/observeUntilFinished.js";
import { createCollection } from "../../lib/collection/index.js";
import { createMemoryLocation } from "../../lib/location/index.js";
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

const createSource = () =>
  createManualSource({
    capabilities: declare({ filter: { status: ["eq"] } }),
    answer: answering([]),
  }).source;

describe("regression 0055 — a write was read back over a listener's move", () => {
  it("keeps a move a location listener makes within the write", () => {
    const location = createMemoryLocation({ href: "/machines?status=failed" });
    const provider = createDataViewsProvider({
      collection,
      source: createSource(),
      location,
    });
    observeUntilFinished(provider);
    const stop = location.subscribe(() => {
      if (location.read().get("status") === "running") {
        stop();
        location.write(new URLSearchParams("status=failed&size=25"));
      }
    });
    readProviderHost(provider).setPredicate({
      field: "status",
      operator: "eq",
      operands: ["running"],
    });
    expect(
      provider.state.get().slice.filter.map(({ operands }) => operands),
    ).toEqual([["failed"]]);
    expect(provider.state.get().window.size).toBe(25);
    expect(location.read().toString()).toBe("status=failed&page=1&size=25");
  });
});
