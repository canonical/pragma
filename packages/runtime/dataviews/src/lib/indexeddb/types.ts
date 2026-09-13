/**
 * The structural IndexedDB surface the store drives, member by member, so
 * the store depends on no DOM library: the platform's `indexedDB`
 * satisfies it by shape, and a test drives it with a fake.
 */

/**
 * An event-handler slot. The parameter is `never` so the platform's own
 * typed handlers fill it; this store never reads the event.
 */
export type Handler = ((event: never) => void) | null;

/** One request; keys and values are the platform's own. */
export type IndexedDBRequest<TResult> = {
  readonly result: TResult;
  onsuccess: Handler;
};

export type IndexedDBObjectStore = {
  get(key: unknown): IndexedDBRequest<unknown>;
  put(value: unknown): IndexedDBRequest<unknown>;
  delete(key: unknown): IndexedDBRequest<unknown>;
  createIndex(name: string, keyPath: string | string[]): unknown;
  index(name: string): {
    getAll(key: unknown): IndexedDBRequest<readonly unknown[]>;
    getAllKeys(key: unknown): IndexedDBRequest<readonly unknown[]>;
  };
};

export type IndexedDBTransaction = {
  readonly error: unknown;
  objectStore(name: string): IndexedDBObjectStore;
  abort(): void;
  oncomplete: Handler;
  onabort: Handler;
};

export type IndexedDBDatabase = {
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

export type IndexedDBOpenRequest = IndexedDBRequest<IndexedDBDatabase> & {
  readonly error: unknown;
  onerror: Handler;
  onupgradeneeded: Handler;
};

/**
 * The factory the store opens its database through. The platform's
 * `indexedDB` satisfies it by shape; the members are methods, so its
 * narrower parameter types still do.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type IndexedDBFactory = {
  open(name: string, version: number): IndexedDBOpenRequest;
};

/**
 * Configuration of one IndexedDB view store: its storage and its scope.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
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
