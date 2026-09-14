/**
 * The structural IndexedDB surface the store drives, member by member, so
 * the store depends on no DOM library: the platform's `indexedDB`
 * satisfies it by shape, and a test drives it with a fake; and the shapes
 * the store's own files share — its records, its transactions and its
 * connection.
 */

import type { JsonValue, ViewPresentation } from "../presentation/index.js";
import type { SavedView } from "../views/index.js";
import type { PREFERENCES, VIEWS } from "./constants.js";

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

/** A stored saved-view record: its key, its format and its fields. */
export type StoredView = {
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
export type StoredPreference = {
  readonly scope: string;
  readonly target: string;
  readonly key: string;
  readonly value: JsonValue;
};

/** Run `then` with a request's result once it succeeds. */
export type Step = <TResult>(
  request: IndexedDBRequest<TResult>,
  then: (result: TResult) => void,
) => void;

/** An object store as one transaction uses it. */
export type TransactionStore = Pick<
  IndexedDBObjectStore,
  "get" | "put" | "delete" | "index"
>;

/**
 * The object stores one transaction runs over. A store outside the
 * transaction's scope throws on every use, naming itself.
 */
export type Stores = {
  readonly views: TransactionStore;
  readonly preferences: TransactionStore;
};

/** One of the two object stores, by name. */
export type StoreName = typeof VIEWS | typeof PREFERENCES;

/** The object stores a transaction locks; both unless it says otherwise. */
export type TransactionScope = readonly StoreName[];

/** One view as stored: readable with its record, missing, or unreadable. */
export type LookedUp =
  | {
      readonly status: "found";
      readonly view: SavedView;
      readonly record: StoredView;
    }
  | { readonly status: "missing" }
  | { readonly status: "unreadable"; readonly reason: string };

/**
 * One transaction's work: it issues its requests and returns how to read
 * the outcome, which is read only once the transaction commits.
 */
export type TransactionWork<TOutcome> = (
  stores: Stores,
  step: Step,
) => () => TOutcome;

/** Configuration of one store's connection to its database. */
export type IndexedDBConnectionConfig = Pick<
  IndexedDBViewStoreConfig,
  "indexedDB" | "database"
> & {
  /** The BroadcastChannel name every store of one scope shares. */
  readonly channelName: string;
};

/**
 * The connection one store drives its database through: transactions
 * over both object stores, reads a disposed store never delivers, and the
 * announcements every committed write makes.
 */
export type IndexedDBConnection = {
  /**
   * Run one transaction over the stores its scope names, both by default.
   * A resolved write is a committed one, under the browser's default
   * durability. A transaction that wrote something is announced as it
   * commits; one that wrote nothing is not.
   * Anything thrown aborts the transaction, which rejects.
   */
  readonly transact: <TOutcome>(
    mode: "readonly" | "readwrite",
    work: TransactionWork<TOutcome>,
    scope?: TransactionScope,
  ) => Promise<TOutcome>;
  /** A read, which a store disposed meanwhile never delivers. */
  readonly read: <TOutcome>(
    work: TransactionWork<TOutcome>,
    scope?: TransactionScope,
  ) => Promise<TOutcome>;
  readonly subscribe: (listener: () => void) => () => void;
  readonly dispose: () => void;
};
