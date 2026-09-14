/**
 * Regression: an arrangement drawn under a view is not restored beneath
 * another.
 *
 * Before the fix, a snapshot's arrangement drawn under an open view was
 * restored beneath the presentation whatever view the provider stood on.
 * Restored where the location carried a query and no view, or into a
 * provider keeping no views, nothing ever showed a view to let it go: the
 * view's hidden column stayed hidden for the session, and the next snapshot
 * handed it on.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { createStandInViewStore } from "../../../testing/createStandInStores.js";
import { byId, declare } from "../../../testing/fixtures.js";
import { createCollection } from "../../lib/collection/index.js";
import { createMemoryLocation } from "../../lib/location/index.js";
import { createDataViewsProvider } from "../../lib/provider/index.js";

const machines = createCollection({
  identify: byId,
  fields: [{ field: "status", kind: "choices", options: ["failed"] }],
});

const snapshot = {
  query: "view=x&status=failed",
  presentation: { "table.hidden": ["cores"] },
};

describe("regression 0033 — an arrangement was restored beneath another view", () => {
  it("restores none where the location stands on no view", () => {
    const provider = createDataViewsProvider({
      collection: machines,
      source: createManualSource({
        capabilities: declare({ filter: { status: ["eq"] } }),
      }).source,
      location: createMemoryLocation({ href: "/machines?status=failed" }),
      views: createStandInViewStore(),
      snapshot,
    });
    expect(provider.presentation.state.get().presentation).toEqual({});
    expect(provider.readSnapshot().presentation).toEqual({});
  });

  it("restores none into a provider that keeps no views", () => {
    const provider = createDataViewsProvider({
      collection: machines,
      source: createManualSource({
        capabilities: declare({ filter: { status: ["eq"] } }),
      }).source,
      snapshot,
    });
    expect(provider.presentation.state.get().presentation).toEqual({});
  });
});
