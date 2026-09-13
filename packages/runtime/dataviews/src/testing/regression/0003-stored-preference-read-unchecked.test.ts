/**
 * Regression: a stored preference reaches the provider only when it has the
 * shape of one.
 *
 * Before the fix, the IndexedDB store cast every record of its preferences
 * store to a preference and handed its value on, so a record another
 * client — or a newer version of this store — had written with a value no
 * presentation can hold, or with no key at all, reached
 * `views.presentation` as it stood, where saved views were already checked
 * and reported unreadable.
 */

import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";
import createDataViewsProvider from "../../lib/provider/createDataViewsProvider.js";
import type { DataViewsProvider } from "../../lib/provider/types.js";
import createSchema from "../../lib/schema/createSchema.js";
import createIndexedDBViewStore from "../../lib/views/createIndexedDBViewStore.js";
import type { ViewStore } from "../../lib/views/types.js";

const schema = createSchema([{ field: "cpu", kind: "number" }]);
const database = "operations-console";

/** A fake-indexeddb factory, driven directly as another client would. */
// `fake-indexeddb` exports the class as a value only, so its instance type is spelled through it.
type Factory = InstanceType<typeof IDBFactory>;

/** Write records straight into the preferences store, as another client would. */
const writePreferences = (
  indexedDB: Factory,
  records: readonly Record<string, unknown>[],
): Promise<void> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(database);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const opened = request.result;
      const transaction = opened.transaction(["preferences"], "readwrite");
      for (const record of records) {
        transaction.objectStore("preferences").put(record);
      }
      transaction.oncomplete = () => {
        opened.close();
        resolve();
      };
      transaction.onabort = () => reject(transaction.error);
    };
  });

const opened: ViewStore[] = [];
const providers: DataViewsProvider[] = [];

afterEach(() => {
  for (const provider of providers.splice(0)) {
    provider.dispose();
  }
  for (const store of opened.splice(0)) {
    store.dispose();
  }
});

describe("regression 0003 — a stored preference is read unchecked", () => {
  it("leaves a record that is not a preference out of the presentation", async () => {
    const indexedDB = new IDBFactory();
    const store = createIndexedDBViewStore({
      indexedDB,
      database,
      collection: "machines",
      partition: null,
    });
    opened.push(store);
    await store.patchPresentation("default", { density: "compact" });
    const scope = JSON.stringify(["machines", null]);
    await writePreferences(indexedDB, [
      { scope, target: "default", key: "width", value: undefined },
      { scope, target: "default", key: "when", value: new Date(0) },
      { scope, target: "default", key: 7, value: 7 },
    ]);

    const provider = createDataViewsProvider({ schema, views: store });
    providers.push(provider);
    const views = provider.views;
    if (views === null) {
      throw new Error("a provider given a store has views");
    }
    const release = views.observe();
    await vi.waitFor(() => {
      expect(views.state.get().presentationFailure).toBeNull();
      expect(views.state.get().presentation).toEqual({ density: "compact" });
    });
    release();
  });
});
