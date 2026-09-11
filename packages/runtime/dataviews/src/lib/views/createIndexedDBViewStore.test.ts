import { forceCloseDatabase, IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";
import createIndexedDBViewStore, {
  type IndexedDBFactory,
  type IndexedDBViewStoreConfig,
} from "./createIndexedDBViewStore.js";
import type { JsonValue, SavedView, ViewStore } from "./types.js";

/**
 * The IndexedDB view store, exercised against `fake-indexeddb`: a complete
 * in-process IndexedDB with real transactions, versioning and connection
 * events. Two stores on one factory are two tabs of one browser profile.
 * It establishes the store's behaviour, not a real browser's durability,
 * eviction, quota policy or private-mode quirks; stand-in factories cover
 * a refused open and an aborted commit. Tests that write records as
 * another client would pin the persisted format: database and store
 * names, key paths and the scope key.
 */

/** A fake-indexeddb factory, driven directly as another client would. */
type Factory = InstanceType<typeof IDBFactory>;

const opened: ViewStore[] = [];

afterEach(() => {
  for (const store of opened.splice(0)) {
    store.dispose();
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const storeOver = (
  indexedDB: IndexedDBFactory,
  overrides: Partial<IndexedDBViewStoreConfig> = {},
): ViewStore => {
  const store = createIndexedDBViewStore({
    indexedDB,
    database: "operations-console",
    collection: "machines",
    partition: null,
    ...overrides,
  });
  opened.push(store);
  return store;
};

/** The scope the default test store writes its records under. */
const machinesScope = JSON.stringify(["machines", null]);

const failed = { id: "failed", name: "Failed", query: "status=failed" };

/** The saved view, or a failure naming what came back instead. */
const saved = (outcome: { readonly status: string }): SavedView => {
  if (!("view" in outcome) || outcome.status !== "saved") {
    throw new Error(`expected a saved view, got ${JSON.stringify(outcome)}`);
  }
  return outcome.view as SavedView;
};

/** Write records straight into the views store, as another client would. */
const writeRaw = (
  indexedDB: Factory,
  records: readonly Record<string, unknown>[],
): Promise<void> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open("operations-console");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(["views"], "readwrite");
      for (const record of records) {
        transaction.objectStore("views").put(record);
      }
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onabort = () => reject(transaction.error);
    };
  });

/** Read one record straight from the views store. */
const readRaw = (indexedDB: Factory, id: string): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open("operations-console");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const get = database
        .transaction(["views"], "readonly")
        .objectStore("views")
        .get([machinesScope, id]);
      get.onsuccess = () => {
        database.close();
        resolve(get.result);
      };
    };
  });

/** Open the database at a newer version, as a newer client in a tab would. */
const upgradeElsewhere = (indexedDB: Factory): Promise<void> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open("operations-console", 2);
    // A connection left open would block the upgrade: fail, never hang.
    request.onblocked = () => reject(new Error("the upgrade was blocked"));
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
  });

/** A factory that refuses to open, as a browser blocking site data does. */
const refusing = (): IndexedDBFactory => ({
  open() {
    throw new DOMException("access to storage is denied", "SecurityError");
  },
});

describe("createIndexedDBViewStore saved views", () => {
  it("creates a view and reads it back", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-11T08:00:00.000Z"));
    const store = storeOver(new IDBFactory());
    const view = saved(await store.create(failed));
    expect(view).toEqual({
      id: "failed",
      name: "Failed",
      query: "status=failed",
      presentation: null,
      revision: 1,
      pinned: false,
      createdAt: "2026-09-11T08:00:00.000Z",
      updatedAt: "2026-09-11T08:00:00.000Z",
    });
    expect(await store.get("failed")).toEqual({ status: "found", view });
    expect(await store.list()).toEqual({ views: [view], unreadable: [] });
  });

  it("keeps presentation saved with the view", async () => {
    const store = storeOver(new IDBFactory());
    const presentation = { widths: { name: 240 }, density: "compact" };
    await store.create({ ...failed, presentation });
    expect(await store.get("failed")).toMatchObject({
      view: { presentation },
    });
  });

  it("reports an id nothing was saved under as missing", async () => {
    const store = storeOver(new IDBFactory());
    expect(await store.get("nothing")).toEqual({ status: "missing" });
    expect(await store.list()).toEqual({ views: [], unreadable: [] });
  });

  it("finds the view a lost creation made when it is retried", async () => {
    const store = storeOver(new IDBFactory());
    const first = saved(await store.create(failed));
    const retried = await store.create({ ...failed });
    expect(retried).toEqual({ status: "saved", view: first });
    expect((await store.list()).views).toHaveLength(1);
  });

  it("never creates over a different view with the same id", async () => {
    const store = storeOver(new IDBFactory());
    const first = saved(await store.create(failed));
    expect(await store.create({ ...failed, name: "Broken" })).toEqual({
      status: "conflict",
      view: first,
    });
  });

  it.each([
    ["query", { query: "status=ready" }],
    ["presentation", { presentation: { density: "open" } }],
  ])(
    "never takes a creation with a different %s for a replay",
    async (_, change) => {
      const store = storeOver(new IDBFactory());
      const first = saved(await store.create(failed));
      expect(await store.create({ ...failed, ...change })).toEqual({
        status: "conflict",
        view: first,
      });
    },
  );

  it("treats a retry after the view changed as a conflict, not a replay", async () => {
    const store = storeOver(new IDBFactory());
    await store.create(failed);
    const renamed = saved(
      await store.update({ id: "failed", revision: 1 }, { name: "Failed" }),
    );
    expect(await store.create(failed)).toEqual({
      status: "conflict",
      view: renamed,
    });
  });

  it("saves changes at the view's revision and grows the revision", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-11T08:00:00.000Z"));
    const store = storeOver(new IDBFactory());
    await store.create(failed);
    vi.setSystemTime(new Date("2026-09-11T09:30:00.000Z"));
    const view = saved(
      await store.update(
        { id: "failed", revision: 1 },
        { query: "as=table&status=failed" },
      ),
    );
    expect(view).toMatchObject({
      name: "Failed",
      query: "as=table&status=failed",
      revision: 2,
      createdAt: "2026-09-11T08:00:00.000Z",
      updatedAt: "2026-09-11T09:30:00.000Z",
    });
    expect(
      saved(
        await store.update({ id: "failed", revision: 2 }, { name: "Broken" }),
      ),
    ).toMatchObject({
      name: "Broken",
      query: "as=table&status=failed",
      revision: 3,
    });
  });

  it("replaces, keeps or removes the saved presentation", async () => {
    const store = storeOver(new IDBFactory());
    await store.create({ ...failed, presentation: { density: "compact" } });
    const kept = saved(
      await store.update({ id: "failed", revision: 1 }, { name: "Kept" }),
    );
    expect(kept.presentation).toEqual({ density: "compact" });
    const replaced = saved(
      await store.update(
        { id: "failed", revision: 2 },
        { presentation: { density: "open" } },
      ),
    );
    expect(replaced.presentation).toEqual({ density: "open" });
    const removed = saved(
      await store.update({ id: "failed", revision: 3 }, { presentation: null }),
    );
    expect(removed.presentation).toBeNull();
  });

  it("refuses a change made against a stale revision", async () => {
    const store = storeOver(new IDBFactory());
    await store.create(failed);
    const current = saved(
      await store.update({ id: "failed", revision: 1 }, { name: "One" }),
    );
    expect(
      await store.update({ id: "failed", revision: 1 }, { name: "Two" }),
    ).toEqual({
      status: "conflict",
      view: current,
    });
    // An authorized overwrite carries the fresh precondition.
    expect(saved(await store.update(current, { name: "Two" }))).toMatchObject({
      name: "Two",
      revision: 3,
    });
  });

  it("reports a change to a view that no longer exists as missing", async () => {
    const store = storeOver(new IDBFactory());
    expect(
      await store.update({ id: "gone", revision: 1 }, { name: "x" }),
    ).toEqual({
      status: "missing",
    });
  });

  it("removes a view at its revision, and a removal retried is no error", async () => {
    const store = storeOver(new IDBFactory());
    await store.create(failed);
    expect(await store.remove({ id: "failed", revision: 1 })).toEqual({
      status: "removed",
    });
    expect(await store.get("failed")).toEqual({ status: "missing" });
    expect(await store.remove({ id: "failed", revision: 1 })).toEqual({
      status: "removed",
    });
  });

  it("refuses to remove a view changed since it was read", async () => {
    const store = storeOver(new IDBFactory());
    await store.create(failed);
    const current = saved(
      await store.update({ id: "failed", revision: 1 }, { name: "One" }),
    );
    expect(await store.remove({ id: "failed", revision: 1 })).toEqual({
      status: "conflict",
      view: current,
    });
    expect(await store.get("failed")).toMatchObject({ status: "found" });
  });
});

describe("createIndexedDBViewStore viewer preferences", () => {
  it("pins and unpins a view, idempotently", async () => {
    const store = storeOver(new IDBFactory());
    await store.create(failed);
    expect(await store.pin("failed")).toEqual({ status: "saved" });
    expect(await store.pin("failed")).toEqual({ status: "saved" });
    expect(await store.get("failed")).toMatchObject({ view: { pinned: true } });
    expect((await store.list()).views[0]?.pinned).toBe(true);
    expect(await store.unpin("failed")).toEqual({ status: "saved" });
    expect(await store.unpin("failed")).toEqual({ status: "saved" });
    expect(await store.get("failed")).toMatchObject({
      view: { pinned: false },
    });
  });

  it("leaves a pin alone when a change is saved", async () => {
    const store = storeOver(new IDBFactory());
    await store.create(failed);
    await store.pin("failed");
    expect(
      saved(await store.update({ id: "failed", revision: 1 }, { name: "x" }))
        .pinned,
    ).toBe(true);
  });

  it("pins nothing for a view that does not exist", async () => {
    const store = storeOver(new IDBFactory());
    expect(await store.unpin("gone")).toEqual({ status: "missing" });
    expect(await store.pin("gone")).toEqual({ status: "missing" });
    // No pin was left behind for a view created under that id later.
    await store.create({ ...failed, id: "gone" });
    expect(await store.get("gone")).toMatchObject({ view: { pinned: false } });
  });

  it("keeps the default arrangement apart from each view's own", async () => {
    const store = storeOver(new IDBFactory());
    await store.create(failed);
    expect(await store.readPresentation("default")).toEqual({});
    expect(
      await store.patchPresentation("default", { density: "compact" }),
    ).toEqual({ status: "saved" });
    expect(
      await store.patchPresentation({ view: "failed" }, { width: 320 }),
    ).toEqual({ status: "saved" });
    expect(await store.readPresentation("default")).toEqual({
      density: "compact",
    });
    expect(await store.readPresentation({ view: "failed" })).toEqual({
      width: 320,
    });
  });

  it("removes a key patched to undefined and keeps the rest", async () => {
    const store = storeOver(new IDBFactory());
    await store.patchPresentation("default", { density: "compact", width: 1 });
    await store.patchPresentation("default", { width: undefined });
    expect(await store.readPresentation("default")).toEqual({
      density: "compact",
    });
  });

  it("patches nothing for a view that does not exist", async () => {
    const store = storeOver(new IDBFactory());
    expect(
      await store.patchPresentation({ view: "gone" }, { width: 1 }),
    ).toEqual({ status: "missing" });
    expect(await store.readPresentation({ view: "gone" })).toEqual({});
  });

  it("removes a view with its pin and its own preferences only", async () => {
    const store = storeOver(new IDBFactory());
    await store.create(failed);
    await store.create({ ...failed, id: "ready", query: "status=ready" });
    await store.pin("failed");
    await store.pin("ready");
    await store.patchPresentation({ view: "failed" }, { width: 1, zoom: 2 });
    await store.patchPresentation({ view: "ready" }, { width: 3 });
    await store.patchPresentation("default", { density: "compact" });

    await store.remove({ id: "failed", revision: 1 });
    // Recreated under the same id, nothing of the old view carries over.
    await store.create(failed);
    expect(await store.get("failed")).toMatchObject({
      view: { pinned: false },
    });
    expect(await store.readPresentation({ view: "failed" })).toEqual({});
    expect(await store.readPresentation({ view: "ready" })).toEqual({
      width: 3,
    });
    expect(await store.readPresentation("default")).toEqual({
      density: "compact",
    });
    expect(await store.get("ready")).toMatchObject({ view: { pinned: true } });
  });
});

describe("createIndexedDBViewStore across tabs", () => {
  it("makes two tabs editing one view conflict instead of clobbering", async () => {
    const indexedDB = new IDBFactory();
    const first = storeOver(indexedDB);
    const second = storeOver(indexedDB);
    await first.create(failed);
    const outcomes = await Promise.all([
      first.update(
        { id: "failed", revision: 1 },
        { query: "status=failed&sort=cpu__asc" },
      ),
      second.update(
        { id: "failed", revision: 1 },
        { query: "status=failed&sort=cpu__desc" },
      ),
    ]);
    expect(outcomes.map((outcome) => outcome.status)).toEqual([
      "saved",
      "conflict",
    ]);
    expect(await second.get("failed")).toMatchObject({
      view: { query: "status=failed&sort=cpu__asc", revision: 2 },
    });
  });

  it("keeps both tabs' changes to different preference keys", async () => {
    const indexedDB = new IDBFactory();
    const first = storeOver(indexedDB);
    const second = storeOver(indexedDB);
    await Promise.all([
      first.patchPresentation("default", { "width:name": 240 }),
      second.patchPresentation("default", { "width:cpu": 80 }),
    ]);
    expect(await first.readPresentation("default")).toEqual({
      "width:name": 240,
      "width:cpu": 80,
    });
  });

  it("lets the last committed write win for one preference key", async () => {
    const indexedDB = new IDBFactory();
    const first = storeOver(indexedDB);
    const second = storeOver(indexedDB);
    await Promise.all([
      first.patchPresentation("default", { density: "compact" }),
      second.patchPresentation("default", { density: "open" }),
    ]);
    expect(await first.readPresentation("default")).toEqual({
      density: "open",
    });
  });

  it("tells this tab's listeners once a write commits, and only then", async () => {
    const store = storeOver(new IDBFactory());
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    await store.create(failed);
    expect(listener).toHaveBeenCalledTimes(1);
    // Nothing written, nothing announced: conflicts, replays and no-ops.
    await store.update({ id: "failed", revision: 5 }, { name: "stale" });
    await store.remove({ id: "failed", revision: 5 });
    await store.create(failed);
    await store.unpin("failed");
    await store.remove({ id: "gone", revision: 1 });
    await store.patchPresentation("default", {});
    // Reads announce nothing, or a listener that reads again would loop.
    await store.list();
    await store.get("failed");
    await store.readPresentation("default");
    expect(listener).toHaveBeenCalledTimes(1);
    await store.pin("failed");
    await store.pin("failed");
    expect(listener).toHaveBeenCalledTimes(2);
    // A write that only deletes is a write too.
    await store.unpin("failed");
    expect(listener).toHaveBeenCalledTimes(3);
    await store.remove({ id: "failed", revision: 1 });
    expect(listener).toHaveBeenCalledTimes(4);
    unsubscribe();
    await store.create(failed);
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it("tells another tab's listeners so they read again", async () => {
    const indexedDB = new IDBFactory();
    const first = storeOver(indexedDB);
    const second = storeOver(indexedDB);
    const listener = vi.fn();
    second.subscribe(listener);
    await first.create(failed);
    await vi.waitFor(() => expect(listener).toHaveBeenCalled());
    expect((await second.list()).views.map(({ id }) => id)).toEqual(["failed"]);
  });

  it("still tells its own listeners where the platform has no BroadcastChannel", async () => {
    vi.stubGlobal("BroadcastChannel", undefined);
    const store = storeOver(new IDBFactory());
    const listener = vi.fn();
    store.subscribe(listener);
    await store.create(failed);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("tells a listener subscribed after dispose nothing where the platform has no BroadcastChannel", async () => {
    vi.stubGlobal("BroadcastChannel", undefined);
    const store = storeOver(new IDBFactory());
    await store.list();
    const creating = store.create(failed);
    store.dispose();
    const late = vi.fn();
    store.subscribe(late);
    expect(saved(await creating).id).toBe("failed");
    await Promise.resolve();
    expect(late).not.toHaveBeenCalled();
  });

  it("closes for another tab's upgrade instead of blocking it", async () => {
    const indexedDB = new IDBFactory();
    const store = storeOver(indexedDB);
    await store.create(failed);
    await upgradeElsewhere(indexedDB);
    // The newer database is not this client's to read.
    const listing = store.list();
    await expect(listing).rejects.toThrow(/^view storage is unavailable: /);
    await expect(listing).rejects.toHaveProperty("cause.name", "VersionError");
  });

  it("reopens on the next call after the platform closes the connection", async () => {
    const indexedDB = new IDBFactory();
    const connections: unknown[] = [];
    const store = storeOver({
      open(name, version) {
        const request = indexedDB.open(name, version);
        request.addEventListener("success", () => {
          connections.push(request.result);
        });
        return request;
      },
    });
    await store.create(failed);
    forceCloseDatabase(connections[0]);
    expect((await store.list()).views).toHaveLength(1);
    expect(connections).toHaveLength(2);
  });
});

describe("createIndexedDBViewStore scope and lifecycle", () => {
  it("never shows one partition another's views", async () => {
    const indexedDB = new IDBFactory();
    const alice = storeOver(indexedDB, { partition: "account:alice" });
    const bob = storeOver(indexedDB, { partition: "account:bob" });
    const heard = vi.fn();
    bob.subscribe(heard);
    // A second tab of Alice's hears her writes, so Bob has had his chance.
    const aliceElsewhere = vi.fn();
    storeOver(indexedDB, { partition: "account:alice" }).subscribe(
      aliceElsewhere,
    );
    await alice.create(failed);
    await alice.pin("failed");
    await alice.patchPresentation("default", { density: "compact" });
    await vi.waitFor(() => expect(aliceElsewhere).toHaveBeenCalledTimes(3));

    expect(heard).not.toHaveBeenCalled();
    expect(await bob.list()).toEqual({ views: [], unreadable: [] });
    expect(await bob.get("failed")).toEqual({ status: "missing" });
    expect(await bob.readPresentation("default")).toEqual({});
    expect(await bob.pin("failed")).toEqual({ status: "missing" });
  });

  it("never shows one collection another's views", async () => {
    const indexedDB = new IDBFactory();
    await storeOver(indexedDB).create(failed);
    expect(
      await storeOver(indexedDB, { collection: "clusters" }).list(),
    ).toEqual({ views: [], unreadable: [] });
  });

  it("detaches on dispose: calls reject and listeners are dropped", async () => {
    const indexedDB = new IDBFactory();
    const store = storeOver(indexedDB);
    await store.create(failed);
    const listener = vi.fn();
    store.subscribe(listener);
    const reading = store.list();
    store.dispose();
    store.dispose();
    await expect(reading).rejects.toThrow("the view store is disposed");
    await expect(store.get("failed")).rejects.toThrow("disposed");
    await expect(store.create(failed)).rejects.toThrow("disposed");
    expect(store.subscribe(listener)).toBeTypeOf("function");
    // Another tab's writes no longer reach it, though they reach a witness.
    const witness = vi.fn();
    storeOver(indexedDB).subscribe(witness);
    await storeOver(indexedDB).pin("failed");
    await vi.waitFor(() => expect(witness).toHaveBeenCalled());
    expect(listener).not.toHaveBeenCalled();
  });

  it("never lets a throwing listener fail a committed write", async () => {
    const thrown: unknown[] = [];
    vi.stubGlobal("queueMicrotask", (task: () => void) => {
      void Promise.resolve().then(() => {
        try {
          task();
        } catch (error) {
          thrown.push(error);
        }
      });
    });
    const store = storeOver(new IDBFactory());
    const after = vi.fn();
    store.subscribe(() => {
      throw new Error("the listener failed");
    });
    store.subscribe(after);
    expect(saved(await store.create(failed)).id).toBe("failed");
    await vi.waitFor(() => expect(after).toHaveBeenCalledTimes(1));
    expect(thrown).toEqual([new Error("the listener failed")]);
  });

  it("skips a listener unsubscribed before its notice runs", async () => {
    const store = storeOver(new IDBFactory());
    const later = vi.fn();
    let unsubscribeLater = (): void => {};
    store.subscribe(() => {
      unsubscribeLater();
    });
    unsubscribeLater = store.subscribe(later);
    await store.create(failed);
    await Promise.resolve();
    expect(later).not.toHaveBeenCalled();
  });

  it("tells other tabs of a write that committed after it was disposed", async () => {
    const indexedDB = new IDBFactory();
    const leaving = storeOver(indexedDB);
    const staying = storeOver(indexedDB);
    const heard = vi.fn();
    staying.subscribe(heard);
    await leaving.list();
    const close = vi.spyOn(BroadcastChannel.prototype, "close");
    const creating = leaving.create(failed);
    leaving.dispose();
    await creating;
    await vi.waitFor(() => expect(heard).toHaveBeenCalled());
    // Its own channel on dispose, and the one it told the others through.
    expect(close).toHaveBeenCalledTimes(2);
  });

  it("resolves a write that committed before it was disposed", async () => {
    const store = storeOver(new IDBFactory());
    await store.list();
    const creating = store.create(failed);
    store.dispose();
    expect(saved(await creating).id).toBe("failed");
  });

  it("rejects a call made while its storage is still opening, and closes it", async () => {
    const indexedDB = new IDBFactory();
    const store = storeOver(indexedDB);
    const reading = store.list();
    store.dispose();
    await expect(reading).rejects.toThrow("the view store is disposed");
    // The connection that opened after dispose was closed, not left open.
    await upgradeElsewhere(indexedDB);
  });

  it("never commits a write issued while its storage was still opening", async () => {
    const indexedDB = new IDBFactory();
    const store = storeOver(indexedDB);
    const creating = store.create(failed);
    store.dispose();
    await expect(creating).rejects.toThrow("the view store is disposed");
    expect(await readRaw(indexedDB, "failed")).toBeUndefined();
  });

  it("closes its connection on dispose", async () => {
    const indexedDB = new IDBFactory();
    const connections: { close(): void }[] = [];
    const store = storeOver({
      open(name, version) {
        const request = indexedDB.open(name, version);
        request.addEventListener("success", () => {
          connections.push(request.result);
        });
        return request;
      },
    });
    await store.list();
    const [connection] = connections;
    if (connection === undefined) {
      throw new Error("expected an open connection");
    }
    const close = vi.spyOn(connection, "close");
    store.dispose();
    await vi.waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  });

  it("drops listeners already queued when a listener disposes the store", async () => {
    const store = storeOver(new IDBFactory());
    const later = vi.fn();
    store.subscribe(() => {
      store.dispose();
    });
    store.subscribe(later);
    await store.create(failed);
    await Promise.resolve();
    expect(later).not.toHaveBeenCalled();
  });

  it("lets a failing open and a late platform close pass after dispose", async () => {
    const indexedDB = new IDBFactory();
    await upgradeElsewhere(indexedDB);
    const failing = storeOver(indexedDB);
    const reading = failing.list();
    failing.dispose();
    await expect(reading).rejects.toThrow(/^view storage is unavailable: /);

    const fresh = new IDBFactory();
    const connections: unknown[] = [];
    const closing = storeOver({
      open(name, version) {
        const request = fresh.open(name, version);
        request.addEventListener("success", () => {
          connections.push(request.result);
        });
        return request;
      },
    });
    await closing.list();
    closing.dispose();
    await vi.waitFor(() => expect(connections).toHaveLength(1));
    forceCloseDatabase(connections[0]);
    await expect(closing.list()).rejects.toThrow("disposed");
  });
});

describe("createIndexedDBViewStore failures", () => {
  it("rejects when storage is unavailable and never claims to have saved", async () => {
    const store = storeOver(refusing());
    const creating = store.create(failed);
    await expect(creating).rejects.toThrow(
      "view storage is unavailable: access to storage is denied",
    );
    await expect(creating).rejects.toHaveProperty(
      "cause.name",
      "SecurityError",
    );
    await expect(store.list()).rejects.toThrow(/unavailable/);
  });

  it("retries opening on the next call after a failure", async () => {
    const indexedDB = new IDBFactory();
    let refuse = true;
    const store = storeOver({
      open(name, version) {
        if (refuse) {
          refuse = false;
          throw new DOMException("storage is busy", "UnknownError");
        }
        return indexedDB.open(name, version);
      },
    });
    await expect(store.create(failed)).rejects.toThrow(/busy/);
    expect(saved(await store.create(failed)).id).toBe("failed");
  });

  it("rejects a write whose request is refused at once, leaving nothing half-saved", async () => {
    const store = storeOver(new IDBFactory());
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementationOnce(() => {
      throw new DOMException(
        "the quota has been exceeded",
        "QuotaExceededError",
      );
    });
    const creating = store.create(failed);
    await expect(creating).rejects.toThrow(
      "view storage failed: the quota has been exceeded",
    );
    await expect(creating).rejects.toHaveProperty(
      "cause.name",
      "QuotaExceededError",
    );
    expect(await store.list()).toEqual({ views: [], unreadable: [] });
  });

  it("rejects a patch storage cannot hold, leaving the other keys unwritten", async () => {
    const store = storeOver(new IDBFactory());
    const patch = {
      density: "compact",
      callback: (() => {}) as unknown as JsonValue,
    };
    await expect(store.patchPresentation("default", patch)).rejects.toThrow(
      /^view storage failed: /,
    );
    expect(await store.readPresentation("default")).toEqual({});
  });

  /**
   * A factory whose one connection is a stand-in, for platform behaviour
   * fake-indexeddb cannot be made to show.
   */
  const connectingTo = (transaction: () => unknown): IndexedDBFactory => {
    const request = {
      result: {
        transaction,
        close() {},
        onversionchange: null,
        onclose: null,
      },
      error: null,
      onsuccess: null as (() => void) | null,
      onerror: null,
      onupgradeneeded: null,
    };
    return {
      open() {
        queueMicrotask(() => request.onsuccess?.());
        return request as unknown as ReturnType<IndexedDBFactory["open"]>;
      },
    };
  };

  it("rejects when the connection is closing under it", async () => {
    const store = storeOver(
      connectingTo(() => {
        throw new DOMException(
          "the connection is closing",
          "InvalidStateError",
        );
      }),
    );
    await expect(store.list()).rejects.toThrow(
      "view storage failed: the connection is closing",
    );
  });

  it("rejects a commit the platform aborts for want of room", async () => {
    // Browsers report an exhausted quota by aborting the transaction.
    const pending = () => ({ result: undefined, onsuccess: null });
    const objectStore = {
      get: pending,
      put: pending,
      delete: pending,
      index: () => ({ getAll: pending, getAllKeys: pending }),
    };
    const store = storeOver(
      connectingTo(() => {
        const transaction = {
          error: null as unknown,
          onabort: null as (() => void) | null,
          oncomplete: null,
          abort() {},
          objectStore: () => objectStore,
        };
        queueMicrotask(() => {
          transaction.error = new DOMException(
            "the quota has been exceeded",
            "QuotaExceededError",
          );
          transaction.onabort?.();
        });
        return transaction;
      }),
    );
    const patching = store.patchPresentation("default", { density: "open" });
    await expect(patching).rejects.toThrow(
      "view storage failed: the quota has been exceeded",
    );
    await expect(patching).rejects.toHaveProperty(
      "cause.name",
      "QuotaExceededError",
    );
  });
});

describe("createIndexedDBViewStore stored records", () => {
  const record = (fields: Record<string, unknown>) => ({
    scope: machinesScope,
    v: 1,
    name: "Stored",
    query: "status=failed",
    revision: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...fields,
  });

  it("reports records it cannot read and never overwrites them", async () => {
    const indexedDB = new IDBFactory();
    const store = storeOver(indexedDB);
    await store.list();
    const newer = record({ id: "newer", v: 2, owner: "team:ops" });
    await writeRaw(indexedDB, [
      record({ id: "older", v: undefined }),
      newer,
      record({ id: "renamed", name: 7 }),
      record({ id: "listed", presentation: ["not", "keyed"] }),
      record({ id: "fraction", revision: 1.5 }),
      record({ id: "zeroth", revision: 0 }),
      record({ id: "undated", createdAt: 7 }),
      record({ id: "ok" }),
    ]);

    const { views, unreadable } = await store.list();
    expect(views.map(({ id }) => id)).toEqual(["ok"]);
    expect(unreadable).toEqual([
      {
        id: "fraction",
        reason: "the record does not have the shape of a saved view",
      },
      {
        id: "listed",
        reason: "the record does not have the shape of a saved view",
      },
      {
        id: "newer",
        reason: "record version 2 is not the supported version 1",
      },
      {
        id: "older",
        reason: "record version undefined is not the supported version 1",
      },
      {
        id: "renamed",
        reason: "the record does not have the shape of a saved view",
      },
      {
        id: "undated",
        reason: "the record does not have the shape of a saved view",
      },
      {
        id: "zeroth",
        reason: "the record does not have the shape of a saved view",
      },
    ]);

    expect(await store.get("newer")).toEqual({
      status: "unreadable",
      reason: "record version 2 is not the supported version 1",
    });
    expect(
      await store.update({ id: "newer", revision: 1 }, { name: "x" }),
    ).toMatchObject({
      status: "unreadable",
    });
    expect(await store.remove({ id: "newer", revision: 1 })).toMatchObject({
      status: "unreadable",
    });
    expect(await store.create({ ...failed, id: "newer" })).toMatchObject({
      status: "unreadable",
    });
    expect(await readRaw(indexedDB, "newer")).toEqual(newer);
  });

  it("carries fields it does not know through an update", async () => {
    const indexedDB = new IDBFactory();
    const store = storeOver(indexedDB);
    await store.list();
    await writeRaw(indexedDB, [
      record({ id: "shared", ext: { color: "teal" }, owner: "team:ops" }),
    ]);
    await store.update({ id: "shared", revision: 1 }, { name: "Renamed" });
    expect(await readRaw(indexedDB, "shared")).toMatchObject({
      name: "Renamed",
      revision: 2,
      ext: { color: "teal" },
      owner: "team:ops",
    });
  });
});
