/**
 * Regression: a collapse over the open view keeps the refused clauses beside
 * it.
 *
 * Before the fix, a transition was read as moving the view alone only when
 * the view differed from the location's. Opening or reverting to the view
 * already open, with a group collapsed, moves only what has no spelling:
 * yet the loop rewrote the whole location, erasing a refused clause and its
 * report.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import createRecordingLocation from "../../../testing/createRecordingLocation.js";
import { createStandInViewStore } from "../../../testing/createStandInStores.js";
import { answering, byId, declare } from "../../../testing/fixtures.js";
import observeUntilFinished from "../../../testing/observeUntilFinished.js";
import { createCollection } from "../../lib/collection/index.js";
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

describe("regression 0048 — a collapse over the open view erased a refused clause", () => {
  it("writes nothing and keeps the refused clause and its report", () => {
    const { location, writes } = createRecordingLocation({
      href: "/machines?view=v1&status=melted",
    });
    const provider = createDataViewsProvider({
      collection,
      source: createManualSource({
        capabilities: declare({ filter: { status: ["isAny"] } }),
        answer: answering([]),
      }).source,
      location,
      // The listing still loading: the view stays named.
      views: createStandInViewStore({ list: () => new Promise(() => {}) }),
    });
    observeUntilFinished(provider);
    writes.length = 0;
    const { slice, window } = provider.state.get();
    readProviderHost(provider).adopt(
      { slice, window: { ...window, collapsed: [["failed"]] } },
      "view",
      "v1",
    );
    expect(writes).toEqual([]);
    expect(location.read().get("status")).toBe("melted");
    expect(provider.issues.get().map(({ parameter }) => parameter)).toEqual([
      "status",
    ]);
  });
});
