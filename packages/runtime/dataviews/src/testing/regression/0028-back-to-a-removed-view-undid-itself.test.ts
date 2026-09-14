/**
 * Regression: Back to an entry naming a removed view keeps the query it
 * reached.
 *
 * Before the fix, adopting a query with its view moved the view before the
 * adopted state was published. The saved views, hearing an id no listed
 * view answered to, dropped it over the query the host still published —
 * the one being left — so Back to `view=A&status=failed` put the later
 * query back and replaced the entry Back had reached with it.
 */

import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
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

const collection = createCollection({
  identify: byId,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "running"] },
    { field: "cores", kind: "number", min: 1 },
  ],
});

describe("regression 0028 — Back to a removed view undid itself", () => {
  it("keeps the query Back reached, and respells its entry without the view's id", async () => {
    const store = openIndexedDBTab(new IDBFactory());
    await store.create({
      id: "a",
      name: "Failed",
      query: "as=table&status=failed",
      presentation: {},
    });
    const { location, writes, move } = createRecordingLocation({
      href: "/machines",
    });
    const provider = createDataViewsProvider({
      collection,
      source: createManualSource({
        capabilities: declare({
          filter: { status: ["eq"], cores: ["gte"] },
        }),
        answer: answering([]),
      }).source,
      location,
      views: store,
    });
    const views = provider.views;
    if (views === null) {
      throw new Error("expected views over the store given");
    }
    observeUntilFinished(provider);
    await vi.waitFor(() => {
      expect(views.state.get().listing.status).toBe("ready");
    });
    await views.open("a");
    readProviderHost(provider).setPredicate({
      field: "cores",
      operator: "gte",
      operands: [8],
    });
    expect((await views.remove()).status).toBe("removed");
    writes.length = 0;

    // Back, to the entry the view was opened in.
    move("view=a&status=failed&page=1&size=50");

    expect(provider.state.get().slice.filter).toEqual([
      { field: "status", operator: "eq", operands: ["failed"] },
    ]);
    expect(location.read().toString()).toBe("status=failed&page=1&size=50");
    expect(writes).toEqual([["status=failed&page=1&size=50", "replace"]]);
  });
});
