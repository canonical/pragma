/**
 * Regression: a reset respells a location carrying a refused clause.
 *
 * Before the fix, a transition was read as moving the open view alone
 * whenever its query matched what the location decoded to. A reset over a
 * location carrying a refused clause returns to the empty query, which that
 * location decodes to as well: the reset wrote nothing, and the refused
 * clause and its report stayed.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { createStandInViewStore } from "../../../testing/createStandInStores.js";
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

describe("regression 0046 — a reset kept a refused clause", () => {
  it("respells the location and clears the report", () => {
    const location = createMemoryLocation({ href: "/machines?status=melted" });
    const provider = createDataViewsProvider({
      collection,
      source: createSource(),
      location,
    });
    observeUntilFinished(provider);
    expect(provider.issues.get().map(({ parameter }) => parameter)).toEqual([
      "status",
    ]);
    provider.reset();
    expect(location.read().has("status")).toBe(false);
    expect(provider.issues.get()).toEqual([]);
  });

  it("respells a location naming a view the reset closes", () => {
    const location = createMemoryLocation({
      href: "/machines?view=x&status=melted",
    });
    const provider = createDataViewsProvider({
      collection,
      source: createSource(),
      location,
      // The listing still loading: the view stays named.
      views: createStandInViewStore({ list: () => new Promise(() => {}) }),
    });
    observeUntilFinished(provider);
    expect(provider.issues.get().map(({ parameter }) => parameter)).toEqual([
      "status",
    ]);
    provider.reset();
    expect(location.read().toString()).toBe("page=1&size=50");
    expect(provider.issues.get()).toEqual([]);
  });
});
