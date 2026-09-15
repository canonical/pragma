/**
 * Regression: a move made while an observation's first pass runs is heard.
 *
 * Before the fix, the location loop subscribed after its first pass and
 * awaited the location's spelling at that moment as its own echo. A listener
 * woken by the pass's adoption that moved the location then went unheard:
 * the host stayed on the old query while the location carried another.
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

const createSource = () =>
  createManualSource({
    capabilities: declare({ filter: { status: ["isAny"] } }),
    answer: answering([]),
  }).source;

describe("regression 0047 — a move during the first pass went unheard", () => {
  it("reads a move a listener makes while the first pass adopts", () => {
    const location = createMemoryLocation({ href: "/machines?status=running" });
    const provider = createDataViewsProvider({
      collection,
      source: createSource(),
      location,
    });
    // Moved while nothing observed, so the first pass adopts.
    location.write(new URLSearchParams("status=failed"));
    let moved = false;
    provider.state.subscribe(() => {
      if (!moved) {
        moved = true;
        location.write(new URLSearchParams("size=25"));
      }
    });
    observeUntilFinished(provider);
    expect(provider.state.get().slice.filter).toEqual([]);
    expect(provider.state.get().window.size).toBe(25);
    expect(location.read().toString()).toBe("page=1&size=25");
  });

  it("reads a later return to the pass's own respelling as a move", () => {
    const location = createMemoryLocation({ href: "/machines?status=running" });
    const provider = createDataViewsProvider({
      collection,
      source: createSource(),
      location,
    });
    // Moved while nothing observed, so the first pass adopts and respells.
    location.write(new URLSearchParams("status=failed"));
    let moved = false;
    provider.state.subscribe(() => {
      if (!moved) {
        moved = true;
        location.write(new URLSearchParams("page=1&size=25"));
      }
    });
    observeUntilFinished(provider);
    expect(provider.state.get().window.size).toBe(25);
    location.write(new URLSearchParams("status=failed&page=1&size=50"));
    expect(provider.state.get().window.size).toBe(50);
    expect(
      provider.state.get().slice.filter.map(({ operands }) => operands),
    ).toEqual([["failed"]]);
  });
});
