import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it, onTestFinished } from "vitest";
import createIndexedDBConnection from "./createIndexedDBConnection.js";
import createIndexedDBViewStore from "./createIndexedDBViewStore.js";

describe("createIndexedDBConnection", () => {
  it("refuses, by name, a store a transaction did not lock", async () => {
    const indexedDB = new IDBFactory();
    const store = createIndexedDBViewStore({
      indexedDB,
      database: "operations-console",
      collection: "machines",
      partition: null,
    });
    onTestFinished(store.dispose);
    await store.create({ id: "v1", name: "One", query: "as=table" });
    // The default arrangement locks the preferences alone; a view's asks
    // for both. A store outside the lock is a fault, not a silent miss.
    const { transact, dispose } = createIndexedDBConnection({
      indexedDB,
      database: "operations-console",
      channelName: "test",
    });
    onTestFinished(dispose);
    await expect(
      transact(
        "readonly",
        ({ views }) => {
          views.get(["x", "v1"]);
          return () => null;
        },
        ["preferences"],
      ),
    ).rejects.toThrow('the transaction does not include the "views" store');
  });
});
