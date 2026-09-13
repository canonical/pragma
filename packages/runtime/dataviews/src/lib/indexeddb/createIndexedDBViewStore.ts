import reasonOf from "../source/reasonOf.js";
import type {
  JsonValue,
  PreferenceResult,
  PresentationTarget,
  SavedView,
  UnreadableView,
  ViewCreateResult,
  ViewGetResult,
  ViewList,
  ViewPresentation,
  ViewRemoveResult,
  ViewStore,
  ViewUpdateResult,
} from "../views/types.js";

/**
 * An event-handler slot. The parameter is `never` so the platform's own
 * typed handlers fill it; this store never reads the event.
 */
type Handler = ((event: never) => void) | null;

/** One request; keys and values are the platform's own. */
type IndexedDBRequest<TResult> = {
  readonly result: TResult;
  onsuccess: Handler;
};

type IndexedDBObjectStore = {
  get(key: unknown): IndexedDBRequest<unknown>;
  put(value: unknown): IndexedDBRequest<unknown>;
  delete(key: unknown): IndexedDBRequest<unknown>;
  createIndex(name: string, keyPath: string | string[]): unknown;
  index(name: string): {
    getAll(key: unknown): IndexedDBRequest<readonly unknown[]>;
    getAllKeys(key: unknown): IndexedDBRequest<readonly unknown[]>;
  };
};

type IndexedDBTransaction = {
  readonly error: unknown;
  objectStore(name: string): IndexedDBObjectStore;
  abort(): void;
  oncomplete: Handler;
  onabort: Handler;
};

type IndexedDBDatabase = {
  createObjectStore(
    name: string,
    options: { keyPath: string[] },
  ): IndexedDBObjectStore;
  transaction(
    names: string[],
    mode: "readonly" | "readwrite",
  ): IndexedDBTransaction;
  close(): void;
  onversionchange: Handler;
  onclose: Handler;
};

type IndexedDBOpenRequest = IndexedDBRequest<IndexedDBDatabase> & {
  readonly error: unknown;
  onerror: Handler;
  onupgradeneeded: Handler;
};

/**
 * The structural IndexedDB surface the store drives. The platform's
 * `indexedDB` satisfies it by shape; the members are methods, so its
 * narrower parameter types still do.
 */
export type IndexedDBFactory = {
  open(name: string, version: number): IndexedDBOpenRequest;
};

/** Configuration of one IndexedDB view store: its storage and its scope. */
export type IndexedDBViewStoreConfig = {
  /** The platform's IndexedDB, supplied explicitly: `window.indexedDB`. */
  readonly indexedDB: IndexedDBFactory;
  /**
   * A database of the store's own, named by the application —
   * `operations-console-views` — and never one it uses for anything else:
   * a database already holding other stores is not upgraded to hold these.
   */
  readonly database: string;
  /** A stable key of the collection whose views these are. */
  readonly collection: string;
  /**
   * An opaque partition — account, tenant — so one identity never sees
   * another's views, or null for an application with one identity only.
   * Never a credential.
   */
  readonly partition: string | null;
};

/** The database schema this store creates. Version 1 is the first. */
const DATABASE_VERSION = 1;
/** The saved-view record format this store reads and writes. */
const RECORD_VERSION = 1;
const VIEWS = "views";
const PREFERENCES = "preferences";
/** Preference targets: pins, and presentation by target. */
const PINS = "pins";
const targetKey = (target: PresentationTarget): string =>
  target === "default" ? "default" : `view:${target.view}`;

/** A stored saved-view record: its key, its format and its fields. */
type StoredView = {
  readonly scope: string;
  readonly id: string;
  readonly v: number;
  readonly name: string;
  readonly query: string;
  readonly presentation?: ViewPresentation;
  readonly revision: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

/** One stored preference: a key of a target, in a scope. */
type StoredPreference = {
  readonly scope: string;
  readonly target: string;
  readonly key: string;
  readonly value: JsonValue;
};

/** Run `then` with a request's result once it succeeds. */
type Step = <TResult>(
  request: IndexedDBRequest<TResult>,
  then: (result: TResult) => void,
) => void;

/** An object store as one transaction uses it. */
type TransactionStore = Pick<
  IndexedDBObjectStore,
  "get" | "put" | "delete" | "index"
>;

type Stores = {
  readonly views: TransactionStore;
  readonly preferences: TransactionStore;
};

/** One view as stored: readable with its record, missing, or unreadable. */
type LookedUp =
  | {
      readonly status: "found";
      readonly view: SavedView;
      readonly record: StoredView;
    }
  | { readonly status: "missing" }
  | { readonly status: "unreadable"; readonly reason: string };

/** Whether a stored record is a saved view in the format this store reads. */
const isStoredView = (
  record: Readonly<Record<string, unknown>>,
): record is StoredView => {
  const { v, id, name, query, presentation, revision, createdAt, updatedAt } =
    record;
  return (
    v === RECORD_VERSION &&
    typeof id === "string" &&
    typeof name === "string" &&
    typeof query === "string" &&
    typeof revision === "number" &&
    Number.isInteger(revision) &&
    revision >= 1 &&
    typeof createdAt === "string" &&
    typeof updatedAt === "string" &&
    (presentation === undefined ||
      (typeof presentation === "object" &&
        presentation !== null &&
        !Array.isArray(presentation)))
  );
};

/** Whether a value is JSON: what a presentation may hold, and nothing else. */
const isJsonValue = (value: unknown): value is JsonValue => {
  switch (typeof value) {
    case "string":
    case "boolean":
      return true;
    case "number":
      return Number.isFinite(value);
    case "object":
      if (value === null) {
        return true;
      }
      if (Array.isArray(value)) {
        return value.every(isJsonValue);
      }
      return (
        Object.getPrototypeOf(value) === Object.prototype &&
        Object.values(value).every(isJsonValue)
      );
    default:
      return false;
  }
};

/**
 * Whether a stored record is a preference this store can read. Storage is
 * an external boundary — another client, a newer version of this store or
 * a hand-edited database may have written it — so a record is checked
 * before it is read, never cast. One that fails reads as absent: a pin
 * that is not one leaves the view unpinned, a presentation entry that is
 * not one leaves its key unset, and neither is misread as a value.
 */
const isStoredPreference = (record: unknown): record is StoredPreference => {
  if (typeof record !== "object" || record === null) {
    return false;
  }
  const { scope, target, key, value } = record as Readonly<
    Record<string, unknown>
  >;
  return (
    typeof scope === "string" &&
    typeof target === "string" &&
    typeof key === "string" &&
    isJsonValue(value)
  );
};

/** Why a stored record cannot be read as a saved view. */
const unreadableReason = (record: Readonly<Record<string, unknown>>): string =>
  record.v === RECORD_VERSION
    ? "the record does not have the shape of a saved view"
    : `record version ${String(record.v)} is not the supported version ${RECORD_VERSION}`;

/** A stored saved view as this viewer sees it. */
const viewOf = (record: StoredView, pinned: boolean): SavedView => ({
  id: record.id,
  name: record.name,
  query: record.query,
  presentation: record.presentation ?? null,
  revision: record.revision,
  pinned,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

const disposedError = (): Error => new Error("the view store is disposed");

/**
 * Create a local-first view store over IndexedDB, scoped at construction
 * to one collection and one partition of one application's database.
 *
 * View edits are transactional: an update or removal names the revision it
 * was made against, and a stale one is an explicit conflict rather than a
 * silent overwrite — so two tabs editing one view conflict. Presentation
 * preferences are stored one record per key and patched atomically, so two
 * tabs changing different keys both keep their change. Records in a format
 * this store does not know are reported and left untouched, so an older
 * client never destroys a newer one's data.
 *
 * Storage the browser blocks, has no room in, or cannot open rejects with
 * the platform's error as the cause; nothing falls back to memory and
 * claims to persist. Other tabs' writes reach `subscribe` through a
 * BroadcastChannel where the platform has one. Import it explicitly from
 * `@canonical/dataviews-core/indexeddb`.
 */
export default function createIndexedDBViewStore(
  config: IndexedDBViewStoreConfig,
): ViewStore {
  const scope = JSON.stringify([config.collection, config.partition]);
  const listeners = new Set<() => void>();
  const channelName = JSON.stringify([
    "@canonical/dataviews-core",
    config.database,
    scope,
  ]);
  const channel =
    typeof BroadcastChannel === "undefined"
      ? null
      : new BroadcastChannel(channelName);
  let connection: Promise<IndexedDBDatabase> | null = null;
  let disposed = false;

  /**
   * Call each listener in a microtask of its own, as the platform calls event
   * listeners: one that throws is reported without stopping the others,
   * and never turns a committed write into a rejected one.
   */
  const notify = (): void => {
    for (const listener of listeners) {
      queueMicrotask(() => {
        if (listeners.has(listener)) {
          listener();
        }
      });
    }
  };
  if (channel !== null) {
    channel.onmessage = notify;
  }

  /**
   * Tell this tab's listeners and every other store of this scope. A write
   * committing after dispose has no listener here left to tell, but other
   * tabs still hear of it.
   */
  const announce = (): void => {
    if (disposed) {
      if (channel !== null) {
        const parting = new BroadcastChannel(channelName);
        parting.postMessage(null);
        parting.close();
      }
      return;
    }
    channel?.postMessage(null);
    notify();
  };

  const open = (forget: () => void): Promise<IndexedDBDatabase> =>
    new Promise((resolve, reject) => {
      const unavailable = (error: unknown): void => {
        reject(
          new Error(`view storage is unavailable: ${reasonOf(error)}`, {
            cause: error,
          }),
        );
      };
      let request: IndexedDBOpenRequest;
      try {
        request = config.indexedDB.open(config.database, DATABASE_VERSION);
      } catch (error) {
        unavailable(error);
        return;
      }
      // The first version: an upgrade only ever starts from nothing.
      request.onupgradeneeded = () => {
        const database = request.result;
        database
          .createObjectStore(VIEWS, { keyPath: ["scope", "id"] })
          .createIndex("scope", "scope");
        database
          .createObjectStore(PREFERENCES, {
            keyPath: ["scope", "target", "key"],
          })
          .createIndex("target", ["scope", "target"]);
      };
      request.onerror = () => {
        unavailable(request.error);
      };
      request.onsuccess = () => {
        const database = request.result;
        // Another tab upgrading or deleting the database, or the platform
        // closing it, ends this connection; the next call opens a new one.
        const close = (): void => {
          database.close();
          forget();
        };
        database.onversionchange = close;
        database.onclose = close;
        if (disposed) {
          database.close();
          reject(disposedError());
          return;
        }
        resolve(database);
      };
    });

  const connect = (): Promise<IndexedDBDatabase> => {
    if (disposed) {
      return Promise.reject(disposedError());
    }
    if (connection === null) {
      const opening = open(() => {
        if (connection === opening) {
          connection = null;
        }
      });
      connection = opening;
      // A failed open is not kept: the next call retries.
      opening.catch(() => {
        if (connection === opening) {
          connection = null;
        }
      });
    }
    return connection;
  };

  /**
   * Run one transaction over both stores. `work` issues its requests and
   * returns how to read the outcome, which is read only once the
   * transaction commits: a resolved write is a committed one, under the
   * browser's default durability. A transaction that wrote something is
   * announced as it commits; one that wrote nothing is not. Anything
   * thrown aborts the transaction, which rejects.
   */
  const transact = async <TOutcome>(
    mode: "readonly" | "readwrite",
    work: (stores: Stores, step: Step) => () => TOutcome,
  ): Promise<TOutcome> => {
    const database = await connect();
    return new Promise((resolve, reject) => {
      const failed = (error: unknown): void => {
        reject(
          new Error(`view storage failed: ${reasonOf(error)}`, {
            cause: error,
          }),
        );
      };
      let transaction: IndexedDBTransaction;
      try {
        transaction = database.transaction([VIEWS, PREFERENCES], mode);
      } catch (error) {
        failed(error);
        return;
      }
      /** What aborted the transaction, when this store did. */
      let thrown: { readonly error: unknown } | null = null;
      const abort = (error: unknown): void => {
        thrown = { error };
        transaction.abort();
      };
      const step: Step = (request, then) => {
        request.onsuccess = () => {
          try {
            then(request.result);
          } catch (error) {
            abort(error);
          }
        };
      };
      /** Whether this transaction issued a write. */
      let wrote = false;
      const tracked = (store: IndexedDBObjectStore): TransactionStore => ({
        get(key) {
          return store.get(key);
        },
        index(name) {
          return store.index(name);
        },
        put(value) {
          wrote = true;
          return store.put(value);
        },
        delete(key) {
          wrote = true;
          return store.delete(key);
        },
      });
      let outcome: () => TOutcome;
      transaction.oncomplete = () => {
        if (wrote) {
          announce();
        }
        resolve(outcome());
      };
      transaction.onabort = () => {
        failed(thrown === null ? transaction.error : thrown.error);
      };
      try {
        outcome = work(
          {
            views: tracked(transaction.objectStore(VIEWS)),
            preferences: tracked(transaction.objectStore(PREFERENCES)),
          },
          step,
        );
      } catch (error) {
        abort(error);
      }
    });
  };

  /** A read, which a store disposed meanwhile never delivers. */
  const read = async <TOutcome>(
    work: (stores: Stores, step: Step) => () => TOutcome,
  ): Promise<TOutcome> => {
    const outcome = await transact("readonly", work);
    if (disposed) {
      throw disposedError();
    }
    return outcome;
  };

  /** Look one view up with its pin, then continue in the same transaction. */
  const lookUp = (
    { views, preferences }: Stores,
    step: Step,
    id: string,
    then: (found: LookedUp) => void,
  ): void => {
    const viewRequest = views.get([scope, id]);
    // Requests in one transaction complete in order: the view is in hand
    // by the time the pin is.
    step(preferences.get([scope, PINS, id]), (pin) => {
      const record = viewRequest.result as
        | Readonly<Record<string, unknown>>
        | undefined;
      if (record === undefined) {
        then({ status: "missing" });
        return;
      }
      then(
        isStoredView(record)
          ? {
              status: "found",
              view: viewOf(record, isStoredPreference(pin)),
              record,
            }
          : { status: "unreadable", reason: unreadableReason(record) },
      );
    });
  };

  /** Delete one view's pin and its own presentation preferences. */
  const forgetPreferences = (
    { preferences }: Stores,
    step: Step,
    id: string,
  ): void => {
    preferences.delete([scope, PINS, id]);
    step(
      preferences.index("target").getAllKeys([scope, targetKey({ view: id })]),
      (keys) => {
        for (const key of keys) {
          preferences.delete(key);
        }
      },
    );
  };

  /**
   * Pin or unpin a view that exists. Either twice is either once, and the
   * second writes nothing.
   */
  const setPin = (id: string, pinned: boolean): Promise<PreferenceResult> =>
    transact<PreferenceResult>("readwrite", ({ views, preferences }, step) => {
      let exists = false;
      const pinRequest = preferences.get([scope, PINS, id]);
      // Requests in one transaction complete in order: the pin is in hand
      // by the time the view is.
      step(views.get([scope, id]), (record) => {
        exists = record !== undefined;
        if (!exists || (pinRequest.result !== undefined) === pinned) {
          return;
        }
        if (pinned) {
          preferences.put({ scope, target: PINS, key: id, value: true });
        } else {
          preferences.delete([scope, PINS, id]);
        }
      });
      return () => ({ status: exists ? "saved" : "missing" });
    });

  const stamp = (): string => new Date().toISOString();

  return {
    list() {
      return read(({ views, preferences }, step) => {
        const viewsRequest = views.index("scope").getAll(scope);
        let listed: ViewList = { views: [], unreadable: [] };
        step(preferences.index("target").getAll([scope, PINS]), (pins) => {
          const pinned = new Set(
            pins.filter(isStoredPreference).map((pin) => pin.key),
          );
          const found: SavedView[] = [];
          const unreadable: UnreadableView[] = [];
          for (const record of viewsRequest.result as readonly Readonly<
            Record<string, unknown>
          >[]) {
            if (isStoredView(record)) {
              found.push(viewOf(record, pinned.has(record.id)));
            } else {
              unreadable.push({
                id: String(record.id),
                reason: unreadableReason(record),
              });
            }
          }
          listed = { views: found, unreadable };
        });
        return () => listed;
      });
    },

    get(id) {
      return read((stores, step) => {
        let found: ViewGetResult = { status: "missing" };
        lookUp(stores, step, id, (looked) => {
          // The stored record stays inside the store.
          found =
            looked.status === "found"
              ? { status: "found", view: looked.view }
              : looked;
        });
        return () => found;
      });
    },

    create(draft) {
      return transact("readwrite", (stores, step) => {
        // Always set by the lookup before the transaction commits.
        let written: ViewCreateResult;
        lookUp(stores, step, draft.id, (found) => {
          if (found.status === "unreadable") {
            written = found;
            return;
          }
          if (found.status === "found") {
            const { view } = found;
            // The same creation arriving again: an earlier attempt landed.
            const replayed =
              view.revision === 1 &&
              view.name === draft.name &&
              view.query === draft.query &&
              JSON.stringify(view.presentation) ===
                JSON.stringify(draft.presentation ?? null);
            written = { status: replayed ? "saved" : "conflict", view };
            return;
          }
          const now = stamp();
          const record: StoredView = {
            scope,
            id: draft.id,
            v: RECORD_VERSION,
            name: draft.name,
            query: draft.query,
            ...(draft.presentation === undefined
              ? {}
              : { presentation: draft.presentation }),
            revision: 1,
            createdAt: now,
            updatedAt: now,
          };
          stores.views.put(record);
          written = { status: "saved", view: viewOf(record, false) };
        });
        return () => written;
      });
    },

    update({ id, revision }, changes) {
      return transact("readwrite", (stores, step) => {
        let written: ViewUpdateResult = { status: "missing" };
        lookUp(stores, step, id, (found) => {
          if (found.status !== "found") {
            written = found;
            return;
          }
          if (found.view.revision !== revision) {
            written = { status: "conflict", view: found.view };
            return;
          }
          // Fields this client does not know are carried over untouched.
          const { presentation: _dropped, ...kept } = found.record;
          const presentation =
            changes.presentation === undefined
              ? found.view.presentation
              : changes.presentation;
          const record: StoredView = {
            ...kept,
            name: changes.name ?? found.view.name,
            query: changes.query ?? found.view.query,
            ...(presentation === null ? {} : { presentation }),
            revision: revision + 1,
            updatedAt: stamp(),
          };
          stores.views.put(record);
          written = {
            status: "saved",
            view: viewOf(record, found.view.pinned),
          };
        });
        return () => written;
      });
    },

    remove({ id, revision }) {
      return transact("readwrite", (stores, step) => {
        let removal: ViewRemoveResult = {
          status: "removed",
        };
        lookUp(stores, step, id, (found) => {
          if (found.status === "unreadable") {
            removal = found;
            return;
          }
          if (found.status === "found") {
            if (found.view.revision !== revision) {
              removal = { status: "conflict", view: found.view };
              return;
            }
            stores.views.delete([scope, id]);
            forgetPreferences(stores, step, id);
          }
          // A view already gone was removed with its preferences.
        });
        return () => removal;
      });
    },

    pin(id) {
      return setPin(id, true);
    },

    unpin(id) {
      return setPin(id, false);
    },

    readPresentation(target) {
      return read(({ preferences }, step) => {
        const presentation: Record<string, JsonValue> = {};
        step(
          preferences.index("target").getAll([scope, targetKey(target)]),
          (records) => {
            for (const record of records.filter(isStoredPreference)) {
              presentation[record.key] = record.value;
            }
          },
        );
        return () => presentation;
      });
    },

    patchPresentation(target, patch) {
      return transact<PreferenceResult>(
        "readwrite",
        ({ views, preferences }, step) => {
          const key = targetKey(target);
          const apply = (): void => {
            for (const [name, value] of Object.entries(patch)) {
              if (value === undefined) {
                preferences.delete([scope, key, name]);
              } else {
                preferences.put({ scope, target: key, key: name, value });
              }
            }
          };
          if (target === "default") {
            apply();
            return () => ({ status: "saved" });
          }
          let exists = false;
          step(views.get([scope, target.view]), (record) => {
            exists = record !== undefined;
            if (exists) {
              apply();
            }
          });
          return () => ({ status: exists ? "saved" : "missing" });
        },
      );
    },

    subscribe(listener) {
      // A disposed store announces nothing, so a late listener never hears.
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      listeners.clear();
      channel?.close();
      const closing = connection;
      connection = null;
      closing?.then(
        (database) => {
          database.close();
        },
        () => {},
      );
    },
  };
}
