import { describeError } from "../source/index.js";
import { DATABASE_VERSION, PREFERENCES, VIEWS } from "./constants.js";
import type {
  IndexedDBConnection,
  IndexedDBConnectionConfig,
  IndexedDBDatabase,
  IndexedDBObjectStore,
  IndexedDBOpenRequest,
  IndexedDBTransaction,
  Step,
  StoreName,
  TransactionScope,
  TransactionStore,
  TransactionWork,
} from "./types.js";

const BOTH_STORES: TransactionScope = [VIEWS, PREFERENCES];

/** A store the transaction did not lock: every use is a fault, naming it. */
const refuseOutside = (name: StoreName): TransactionStore => {
  const refuse = (): never => {
    throw new Error(`the transaction does not include the "${name}" store`);
  };
  return { get: refuse, put: refuse, delete: refuse, index: refuse };
};

/** The refusing stand-ins, one per store, built once. */
const OUTSIDE: Readonly<Record<StoreName, TransactionStore>> = {
  [VIEWS]: refuseOutside(VIEWS),
  [PREFERENCES]: refuseOutside(PREFERENCES),
};

const createDisposedError = (): Error =>
  new Error("the view store is disposed");

/**
 * Create the connection one store drives its database through: it opens
 * the database on first use and again after the platform closes it, runs
 * each call as one transaction over the stores its scope names — both by
 * default — and announces every committed write to this tab's listeners
 * and, through a BroadcastChannel where the platform has one, to every
 * other tab's.
 *
 * Storage the browser blocks, has no room in, or cannot open rejects with
 * the platform's error as the cause; nothing falls back to memory. A
 * disposed connection rejects every later call, delivers no read begun
 * before, and tells no listener here — other tabs still hear a write that
 * commits after dispose.
 *
 * @note Impure by design: the connection holds the open database, the
 * listeners and the channel to other tabs.
 */
export default function createIndexedDBConnection(
  config: IndexedDBConnectionConfig,
): IndexedDBConnection {
  const { indexedDB, database: name, channelName } = config;
  const listeners = new Set<() => void>();
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
      const rejectUnavailable = (error: unknown): void => {
        reject(
          new Error(`view storage is unavailable: ${describeError(error)}`, {
            cause: error,
          }),
        );
      };
      let request: IndexedDBOpenRequest;
      try {
        request = indexedDB.open(name, DATABASE_VERSION);
      } catch (error) {
        rejectUnavailable(error);
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
        rejectUnavailable(request.error);
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
          reject(createDisposedError());
          return;
        }
        resolve(database);
      };
    });

  const connect = (): Promise<IndexedDBDatabase> => {
    if (disposed) {
      return Promise.reject(createDisposedError());
    }
    if (connection === null) {
      const opening = open(() => {
        if (connection === opening) {
          connection = null;
        }
      });
      connection = opening;
      // A failed open is not kept: the next call retries.
      void opening.catch(() => {
        if (connection === opening) {
          connection = null;
        }
      });
    }
    return connection;
  };

  const transact = async <TOutcome>(
    mode: "readonly" | "readwrite",
    work: TransactionWork<TOutcome>,
    scope: TransactionScope = BOTH_STORES,
  ): Promise<TOutcome> => {
    const database = await connect();
    return new Promise<TOutcome>((resolve, reject) => {
      const rejectFailed = (error: unknown): void => {
        reject(
          new Error(`view storage failed: ${describeError(error)}`, {
            cause: error,
          }),
        );
      };
      let transaction: IndexedDBTransaction;
      try {
        transaction = database.transaction([...scope], mode);
      } catch (error) {
        rejectFailed(error);
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
      const trackWrites = (store: IndexedDBObjectStore): TransactionStore => ({
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
      let readOutcome: () => TOutcome;
      transaction.oncomplete = () => {
        if (wrote) {
          announce();
        }
        resolve(readOutcome());
      };
      transaction.onabort = () => {
        rejectFailed(thrown === null ? transaction.error : thrown.error);
      };
      const openStore = (name: StoreName): TransactionStore =>
        scope.includes(name)
          ? trackWrites(transaction.objectStore(name))
          : OUTSIDE[name];
      try {
        readOutcome = work(
          { views: openStore(VIEWS), preferences: openStore(PREFERENCES) },
          step,
        );
      } catch (error) {
        abort(error);
      }
    });
  };

  return {
    transact,
    async read(work, scope) {
      const outcome = await transact("readonly", work, scope);
      if (disposed) {
        throw createDisposedError();
      }
      return outcome;
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
      void closing?.then(
        (database) => {
          database.close();
        },
        () => {},
      );
    },
  };
}
