/**
 * Regression: a view named while the views cannot be listed closes the open
 * one.
 *
 * Before the fix, a location moving to another view's id while the store's
 * listing had failed left the old view open over the new entry's query:
 * saving overwrote the old view with that query, and reverting wrote the old
 * view's query beside the new view's id.
 */

import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import createRecordingLocation from "../../../testing/createRecordingLocation.js";
import { answering, byId, declare } from "../../../testing/fixtures.js";
import observeUntilFinished from "../../../testing/observeUntilFinished.js";
import openIndexedDBTab from "../../../testing/openIndexedDBTab.js";
import { createCollection } from "../../lib/collection/index.js";
import {
  createDataViewsProvider,
  readProviderHost,
} from "../../lib/provider/index.js";

const machines = createCollection({
  identify: byId,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "running"] },
  ],
});

describe("regression 0035 — an unlisted view id left the old view open", () => {
  it("closes the open view, keeping the id the location carries", async () => {
    const tab = openIndexedDBTab(new IDBFactory());
    await tab.create({
      id: "x",
      name: "Failed",
      query: "as=table&status=failed",
      presentation: {},
    });
    const { location, move } = createRecordingLocation({ href: "/machines" });
    const provider = createDataViewsProvider({
      collection: machines,
      source: createManualSource({
        capabilities: declare({ filter: { status: ["isAny"] } }),
        answer: answering([]),
      }).source,
      location,
      views: tab,
    });
    const views = provider.views;
    if (views === null) {
      throw new Error("expected views over the store given");
    }
    observeUntilFinished(provider);
    await vi.waitFor(() => {
      expect(views.state.get().listing.status).toBe("ready");
    });
    await views.open("x");
    const listing = vi
      .spyOn(tab, "list")
      .mockRejectedValueOnce(new Error("storage is blocked"));
    onTestFinished(() => {
      listing.mockRestore();
    });
    views.refresh();
    await vi.waitFor(() => {
      expect(views.state.get().listing.status).toBe("failed");
    });

    move("view=y&status=running&page=1&size=50");

    expect(readProviderHost(provider).view.get()).toBe("y");
    expect(views.state.get().current).toBeNull();
    expect(views.state.get().modified).toBe(false);
  });
});
