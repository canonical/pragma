/**
 * The saved-view contract: a named query with optional presentation,
 * versioned by revision, and the viewer's own preferences — pins and
 * presentation patches — kept apart from it. Any store may implement it;
 * the IndexedDB store is the local-first one shipped here.
 */

import type { CollectionState } from "../collection/index.js";
import type { ReadonlyChannel } from "../observable/index.js";
import type { Query } from "../query/index.js";
import type { Schema, SchemaFieldDefinition } from "../schema/index.js";
import type { SourceCapabilities } from "../source/index.js";
import type { QueryIssue } from "../wire/index.js";

/**
 * A JSON value.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

/**
 * Presentation as keyed JSON values — widths, density and the like — as a
 * view saves it and as viewer preferences hold it.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ViewPresentation = { readonly [key: string]: JsonValue };

/**
 * One saved view, resolved for this viewer.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type SavedView = {
  readonly id: string;
  readonly name: string;
  /**
   * The query text, stored verbatim. Write it with `encodeQuery` and a null
   * window — canonical, with its renderer: `as=table&status=failed` — so
   * comparing texts tells whether the live query differs from the view.
   */
  readonly query: string;
  /** Presentation saved with the view, or null. */
  readonly presentation: ViewPresentation | null;
  /** Grows with every saved change; the precondition of the next one. */
  readonly revision: number;
  /** Whether this viewer pinned the view. */
  readonly pinned: boolean;
  /** When the view was created, in ISO 8601. */
  readonly createdAt: string;
  /** When the view last changed, in ISO 8601. */
  readonly updatedAt: string;
};

/**
 * The view an edit is made against: its id and the revision last read.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ViewRevision = Pick<SavedView, "id" | "revision">;

/**
 * A view to create. The caller mints the id, so retrying a creation whose
 * response was lost finds the view instead of duplicating it.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ViewDraft = {
  readonly id: string;
  readonly name: string;
  readonly query: string;
  /** Presentation saved with the view; left out for none. */
  readonly presentation?: ViewPresentation | undefined;
};

/**
 * Changes to a saved view; a field left out keeps its value. Strict on
 * purpose: a field written `undefined` would be applied, not skipped.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ViewChanges = {
  readonly name?: string;
  readonly query?: string;
  /** Null removes the saved presentation. */
  readonly presentation?: ViewPresentation | null;
};

/**
 * A stored record this client cannot read — corrupt, or written in a
 * record version it does not know. It is reported and never overwritten.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type UnreadableView = {
  readonly id: string;
  readonly reason: string;
};

/**
 * Every view in the store's scope.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ViewList = {
  readonly views: readonly SavedView[];
  readonly unreadable: readonly UnreadableView[];
};

/**
 * One view looked up by id.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ViewGetResult =
  | { readonly status: "found"; readonly view: SavedView }
  | { readonly status: "missing" }
  | { readonly status: "unreadable"; readonly reason: string };

/**
 * The outcome of a creation. A conflict is a different view already under
 * the id; the same creation arriving again is `saved`.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ViewCreateResult =
  | { readonly status: "saved"; readonly view: SavedView }
  | { readonly status: "conflict"; readonly view: SavedView }
  | { readonly status: "unreadable"; readonly reason: string };

/**
 * The outcome of an update. A conflict carries the view as it is stored
 * now: reload it, save as a new view, or overwrite it by passing it back.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ViewUpdateResult =
  | { readonly status: "saved"; readonly view: SavedView }
  | { readonly status: "conflict"; readonly view: SavedView }
  | { readonly status: "missing" }
  | { readonly status: "unreadable"; readonly reason: string };

/**
 * The outcome of a removal; removing a view already gone succeeds.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ViewRemoveResult =
  | { readonly status: "removed" }
  | { readonly status: "conflict"; readonly view: SavedView }
  | { readonly status: "unreadable"; readonly reason: string };

/**
 * The outcome of a preference write: `missing` when its view is not there.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type PreferenceResult =
  | { readonly status: "saved" }
  | { readonly status: "missing" };

/**
 * Where presentation preferences apply: the collection's default
 * arrangement, or one view's own, which is distinct from the presentation
 * saved with the view.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type PresentationTarget = "default" | { readonly view: string };

/**
 * Preference keys to set, each to a JSON value, or to remove when
 * undefined. JSON drops undefined, so a REST-backed store sends removals
 * explicitly.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type PresentationPatch = {
  readonly [key: string]: JsonValue | undefined;
};

/**
 * A scoped view store. Its scope — database, collection and partition —
 * is fixed when it is constructed, so no call names it. Storage failures
 * reject; outcomes of the saved-view contract resolve.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ViewStore = {
  readonly list: () => Promise<ViewList>;
  readonly get: (id: string) => Promise<ViewGetResult>;
  /** Create a view, or find the one an earlier attempt with its id made. */
  readonly create: (draft: ViewDraft) => Promise<ViewCreateResult>;
  /** Save changes, provided the view is still at the revision given. */
  readonly update: (
    view: ViewRevision,
    changes: ViewChanges,
  ) => Promise<ViewUpdateResult>;
  /** Remove a view with its pin and preferences, at the revision given. */
  readonly remove: (view: ViewRevision) => Promise<ViewRemoveResult>;
  /** Pin a view for this viewer; pinning twice is pinning once. */
  readonly pin: (id: string) => Promise<PreferenceResult>;
  readonly unpin: (id: string) => Promise<PreferenceResult>;
  /** The preferences at a target; empty for a view that does not exist. */
  readonly readPresentation: (
    target: PresentationTarget,
  ) => Promise<ViewPresentation>;
  /**
   * Apply a patch atomically. The last committed write wins for one key
   * only: patches of different keys never overwrite each other.
   */
  readonly patchPresentation: (
    target: PresentationTarget,
    patch: PresentationPatch,
  ) => Promise<PreferenceResult>;
  /**
   * Hear that the store changed, here or in another tab; read again to see
   * how. The storage stays the authority. A write's own notice comes before
   * the write resolves, and a read begun after a write was called sees it.
   */
  readonly subscribe: (listener: () => void) => () => void;
  /** Detach: close the storage, drop listeners; later calls reject. */
  readonly dispose: () => void;
};

/**
 * A saved-view operation a collection runs.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ViewAction = "open" | "save" | "save-as" | "rename" | "remove";

/**
 * How a saved-view operation ended. `invalid` is a name refused before
 * anything is written; `refused` a view whose query the collection cannot
 * read whole, so opening it would quietly widen the query; `failed` a
 * store that rejected, with nothing claimed saved.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ViewOutcome =
  | { readonly status: "opened" | "saved"; readonly view: SavedView }
  | { readonly status: "removed" }
  | { readonly status: "invalid"; readonly reason: string }
  | {
      readonly status: "refused";
      readonly view: SavedView;
      readonly issues: readonly QueryIssue[];
    }
  | { readonly status: "conflict"; readonly view: SavedView }
  | { readonly status: "missing" }
  | { readonly status: "unreadable"; readonly reason: string }
  | { readonly status: "failed"; readonly reason: string };

/**
 * An outcome an operation settles to: never a refused name.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ViewSettledOutcome = Exclude<
  ViewOutcome,
  { readonly status: "invalid" }
>;

/**
 * The latest saved-view operation: in flight, or settled with its outcome. A
 * refused name is never one: the caller shows it where the name was given.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ViewOperation =
  | { readonly action: ViewAction; readonly status: "pending" }
  | {
      readonly action: ViewAction;
      readonly status: "settled";
      readonly outcome: ViewSettledOutcome;
    };

/**
 * A collection's saved views, as its controls show them.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ViewsState = {
  /**
   * Whether the store's views are known. `idle` until something observes
   * them — so always on a server, which never runs the effect that does —
   * then `pending`, then `ready`, or `failed` with the store's reason.
   */
  readonly listing:
    | { readonly status: "idle" | "pending" | "ready" }
    | { readonly status: "failed"; readonly reason: string };
  /** The readable views, by name. */
  readonly views: readonly SavedView[];
  readonly unreadable: readonly UnreadableView[];
  /** The view the user opened, or null. Deleting it keeps the query. */
  readonly current: SavedView | null;
  /**
   * Whether the live query differs from the open view's. Derived, never
   * stored; the window, the selection and the presentation never count.
   */
  readonly modified: boolean;
  /**
   * The latest operation, or null before the first and after a reset while
   * none is running.
   */
  readonly operation: ViewOperation | null;
  /**
   * The presentation in force: the viewer's default arrangement, under the
   * open view's saved presentation, under the viewer's own changes to that
   * view. A renderer's declared defaults fill every key left out.
   */
  readonly presentation: ViewPresentation;
  /** Why presentation changes are not being read or saved, or null. */
  readonly presentationFailure: string | null;
};

/**
 * A collection's saved views over the store its provider was given: which
 * one is open, whether the query has moved from it, and the operations on
 * it. Operations run one at a time, in call order. A store that rejects
 * settles as `failed`; a state listener that throws rejects that operation
 * alone. An operation still in flight when the scope rotates answers its
 * caller and changes nothing.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ProviderViews = {
  readonly state: ReadonlyChannel<ViewsState>;
  /**
   * Read the store and hear its changes until the release is called. Nothing
   * reads the store before, so a server render stays `idle`; a React host
   * observes from an effect.
   */
  readonly observe: () => () => void;
  /**
   * Read the views and preferences again, and write again the preferences
   * whose write failed.
   */
  readonly reload: () => void;
  /**
   * Apply a view's query on the first page and make it the open view. A
   * query the collection cannot read whole is refused, and the live query is
   * kept.
   */
  readonly open: (id: string) => Promise<ViewOutcome>;
  /** Apply the open view's query again, on the first page. */
  readonly reset: () => void;
  /**
   * Save the live query into the open view, provided the view is unchanged
   * since it was read. After a conflict the stored view is the open one, so
   * saving again overwrites it.
   */
  readonly save: () => Promise<ViewOutcome>;
  /**
   * Save the live query and presentation as a new view, and open it. A
   * creation whose outcome never arrived is retried under the same id. A
   * name that is empty, already another view's, or not checkable because the
   * views are not listed, is refused as `invalid` before anything is written.
   */
  readonly saveAs: (name: string) => Promise<ViewOutcome>;
  /** Rename the open view, refusing a name as `saveAs` does. */
  readonly rename: (name: string) => Promise<ViewOutcome>;
  /** Delete the open view. The live query stays. */
  readonly remove: () => Promise<ViewOutcome>;
  /**
   * Change the presentation: the open view's own, or the default
   * arrangement when none is open. Applied at once and saved behind; a save
   * that fails is reported on `presentationFailure`, never undone.
   */
  readonly arrange: (patch: PresentationPatch) => void;
};

/** The query authority the views read and drive: their provider's. */
export type ViewsHost = {
  /** The schema a stored query is read against. */
  readonly schema: Schema<readonly SchemaFieldDefinition[]>;
  /** What the source can execute; a stored clause outside it is refused. */
  readonly capabilities: SourceCapabilities | null;
  /** The live query and window, which "modified" is derived from. */
  readonly state: ReadonlyChannel<CollectionState<object>>;
  /** Adopt a view's query and window together. */
  readonly adopt: (query: Query) => void;
};

/** Configuration of one provider's views. */
export type ProviderViewsConfig = {
  readonly host: ViewsHost;
  readonly store: ViewStore;
};

/** The provider's views, with what only the provider calls. */
export type OwnedViews = ProviderViews & {
  /** Forget the open view, as a scope rotation resets the query. */
  readonly forget: () => void;
  /** Detach from the store and the host for good. */
  readonly dispose: () => void;
};
