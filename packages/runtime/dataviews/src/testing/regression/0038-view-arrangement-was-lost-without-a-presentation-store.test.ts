/**
 * Regression: an arrangement restored under a view outlives the view's read
 * when the provider keeps its arrangement in memory.
 *
 * Before the fix, the memory a provider with no presentation store kept
 * started holding a restored arrangement only as the default. One drawn
 * under a view — the viewer's own column width on top of the view's saved
 * order — was let go when the view's own preferences were read from that
 * memory, which held nothing for the view, and the width was lost.
 */

import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import createRecordingLocation from "../../../testing/createRecordingLocation.js";
import { answering, byId, declare } from "../../../testing/fixtures.js";
import observeUntilFinished from "../../../testing/observeUntilFinished.js";
import openIndexedDBTab from "../../../testing/openIndexedDBTab.js";
import { createCollection } from "../../lib/collection/index.js";
import { createDataViewsProvider } from "../../lib/provider/index.js";

const collection = createCollection({
  identify: byId,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "running"] },
    { field: "owner", kind: "flag" },
  ],
});

const capabilities = declare({ filter: { status: ["eq"] } });

describe("regression 0038 — a view arrangement was lost without a presentation store", () => {
  it("keeps the arrangement drawn under the view once the view's own preferences are read", async () => {
    const views = openIndexedDBTab(new IDBFactory());
    await views.create({
      id: "a",
      name: "Failed",
      query: "as=table&status=failed",
      presentation: { "table.order": ["name"] },
    });
    const query = "view=a&status=failed&page=1&size=50";
    const drawn = { "table.order": ["name"], "table.width.cores": 120 };
    const { location } = createRecordingLocation({
      href: `/machines?${query}`,
    });
    const provider = createDataViewsProvider({
      collection,
      source: createManualSource({ capabilities, answer: answering([]) })
        .source,
      location,
      views,
      snapshot: { query, presentation: drawn },
    });
    const session = provider.views;
    if (session === null) {
      throw new Error("expected views over the store given");
    }
    observeUntilFinished(provider);
    await vi.waitFor(() => {
      expect(session.state.get().current?.id).toBe("a");
    });
    // The view's own preferences, read from the session's memory, settle.
    await new Promise((settle) => setTimeout(settle));
    expect(provider.presentation.state.get().presentation).toEqual(drawn);
  });
});
