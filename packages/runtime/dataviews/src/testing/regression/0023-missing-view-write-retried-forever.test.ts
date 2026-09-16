/**
 * Regression: a change written to a view the store no longer has is let
 * go with the view, not reported and retried for the rest of the session.
 *
 * Before the fix, a write the store answered `missing` was kept as a
 * failed change, like a write storage refused. With every view's layer kept
 * for the session, the report "the view no longer exists" outlived the view
 * and every refresh wrote the change again, which the store answered
 * `missing` again: an error nothing could clear and a retry that could
 * never succeed.
 */

import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { createIndexedDBViewStore } from "../../lib/indexeddb/index.js";
import {
  createPresentation,
  WRITE_DEADLINE,
} from "../../lib/presentation/index.js";

afterEach(() => {
  vi.useRealTimers();
});

describe("regression 0023 — a missing view's write retried forever", () => {
  it("drops the change with the view, and a refresh writes nothing again", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const indexedDB = new IDBFactory();
    const store = createIndexedDBViewStore({
      indexedDB,
      database: "operations-console-views",
      collection: "machines",
      partition: null,
    });
    onTestFinished(store.dispose);
    const created = await store.create({
      id: "v1",
      name: "One",
      query: "",
      presentation: {},
    });
    if (created.status !== "saved") {
      throw new Error("expected the view to be created");
    }
    const patchPresentation = vi.spyOn(store, "patchPresentation");
    const presentation = createPresentation({ store });
    const release = presentation.observe();
    presentation.show({ id: "v1", presentation: {} });
    // Another tab deletes the view; this tab's resize is still gathering.
    await store.remove(created.view);
    presentation.arrange({ "table.width.name": 120 });
    await vi.waitFor(() => {
      expect(patchPresentation).toHaveBeenCalledTimes(1);
    });
    // The session hears of the deletion and leaves the view.
    presentation.show(null);
    await vi.advanceTimersByTimeAsync(WRITE_DEADLINE);
    expect(presentation.state.get().presentationReason).toBeNull();
    presentation.refresh();
    // The release flushes whatever a refresh gathered: nothing.
    release();
    expect(patchPresentation).toHaveBeenCalledTimes(1);
  });
});
