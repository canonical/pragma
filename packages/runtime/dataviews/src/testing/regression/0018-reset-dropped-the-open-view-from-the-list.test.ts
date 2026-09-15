/**
 * Regression: a provider reset forgets which view is open and keeps the
 * view listed.
 *
 * Before the fix, forgetting the open view reused the path a deleted view
 * takes, which filtered it out of the listing too, so after a reset the
 * picker offered every view but the one that had been open until the
 * store next announced a change.
 */

import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { answering, byId, declare } from "../../../testing/fixtures.js";
import { createCollection } from "../../lib/collection/index.js";
import { createIndexedDBViewStore } from "../../lib/indexeddb/index.js";
import {
  createDataViewsProvider,
  readProviderHost,
} from "../../lib/provider/index.js";

const machines = createCollection({
  identify: byId,
  fields: [{ field: "status", kind: "choices", options: ["failed"] }],
});

describe("regression 0018 — a reset dropped the open view from the list", () => {
  it("keeps the view listed once the provider forgets it", async () => {
    const store = createIndexedDBViewStore({
      indexedDB: new IDBFactory(),
      database: "operations-console-views",
      collection: "machines",
      partition: null,
    });
    onTestFinished(store.dispose);
    const provider = createDataViewsProvider({
      collection: machines,
      source: createManualSource({
        capabilities: declare({ filter: { status: ["isAny"] } }),
        answer: answering([]),
      }).source,
      views: store,
    });
    const { views } = provider;
    if (views === null) {
      throw new Error("a provider given a store has views");
    }
    const release = provider.observe();
    onTestFinished(release);
    await vi.waitFor(() => {
      expect(views.state.get().listing.status).toBe("ready");
    });
    readProviderHost(provider).setPredicate({
      field: "status",
      operator: "isAny",
      operands: ["failed"],
    });
    expect((await views.saveAs("Failed")).status).toBe("saved");
    provider.reset();
    expect(views.state.get().current).toBeNull();
    expect(views.state.get().views.map((view) => view.name)).toEqual([
      "Failed",
    ]);
  });
});
