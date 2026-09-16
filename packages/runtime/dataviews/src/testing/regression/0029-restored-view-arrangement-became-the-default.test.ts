/**
 * Regression: an arrangement restored under a view is never the default.
 *
 * Before the fix, a snapshot's arrangement was always restored as the
 * default arrangement. A server that drew view A — whose saved arrangement
 * hides a column — handed the client that arrangement, and a client keeping
 * its arrangement in memory went on hiding the column after the reader left
 * A, as if it were the reader's own.
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
    { field: "cores", kind: "number", min: 1 },
  ],
});

describe("regression 0029 — a restored view arrangement became the default", () => {
  it("draws the view's arrangement until it opens, and none of it once the view is left", async () => {
    const hidden = { "table.hidden": ["cores"] };
    // The view store holds A; the arrangement lives in memory.
    const views = openIndexedDBTab(new IDBFactory());
    await views.create({
      id: "a",
      name: "Failed",
      query: "status=failed",
      presentation: hidden,
    });
    const { location } = createRecordingLocation({
      href: "/machines?view=a&status=failed&page=1&size=50",
    });
    const provider = createDataViewsProvider({
      collection,
      source: createManualSource({
        capabilities: declare({ filter: { status: ["isAny"] } }),
        answer: answering([]),
      }).source,
      location,
      views,
      snapshot: {
        query: "view=a&status=failed&page=1&size=50",
        presentation: hidden,
      },
    });
    const session = provider.views;
    if (session === null) {
      throw new Error("expected views over the store given");
    }
    // What the server drew, before anything observes.
    expect(provider.presentation.state.get().presentation).toEqual(hidden);
    observeUntilFinished(provider);
    await vi.waitFor(() => {
      expect(session.state.get().current?.id).toBe("a");
    });
    expect(provider.presentation.state.get().presentation).toEqual(hidden);

    // Back, to before the view was opened.
    location.write(new URLSearchParams("status=failed&page=1&size=50"));

    expect(session.state.get().current).toBeNull();
    expect(provider.presentation.state.get().presentation).toEqual({});
  });
});
