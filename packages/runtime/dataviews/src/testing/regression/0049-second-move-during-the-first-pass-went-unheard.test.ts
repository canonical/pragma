/**
 * Regression: every move provoked while an observation's first pass runs is
 * heard.
 *
 * Before the fix, the first pass read the location again once, after its
 * own adoption. A listener that moved the location a second time, woken by
 * that reading's adoption, went unheard: its spelling was awaited as the
 * loop's own echo, and the host stayed on the query before it.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { answering, byId, declare } from "../../../testing/fixtures.js";
import observeUntilFinished from "../../../testing/observeUntilFinished.js";
import { createCollection } from "../../lib/collection/index.js";
import { createMemoryLocation } from "../../lib/location/index.js";
import { createDataViewsProvider } from "../../lib/provider/index.js";

const collection = createCollection({
  identify: byId,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "running"] },
  ],
});

describe("regression 0049 — a second move during the first pass went unheard", () => {
  it("reads each move a listener makes while the pass adopts", () => {
    const location = createMemoryLocation({ href: "/machines?status=running" });
    const provider = createDataViewsProvider({
      collection,
      source: createManualSource({
        capabilities: declare({ filter: { status: ["eq"] } }),
        answer: answering([]),
      }).source,
      location,
    });
    // Moved while nothing observed, so the first pass adopts.
    location.write(new URLSearchParams("status=failed"));
    // The first move already canonical, the second respelled when read.
    const moves = ["page=1&size=25", "size=10"];
    provider.state.subscribe(() => {
      const next = moves.shift();
      if (next !== undefined) {
        location.write(new URLSearchParams(next));
      }
    });
    observeUntilFinished(provider);
    expect(provider.state.get().window.size).toBe(10);
    expect(location.read().toString()).toBe("page=1&size=10");
  });
});
