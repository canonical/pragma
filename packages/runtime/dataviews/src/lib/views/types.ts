/**
 * The saved-view contract: a named query with optional presentation,
 * versioned by revision, with the viewer's pins kept apart from it; the
 * store any application may implement, of which the IndexedDB store is the
 * local-first one shipped here; and the session the provider runs over it.
 */

import type { DataViewsState } from "../coordinator/index.js";
import type { ReadonlyChannel } from "../observable/index.js";
import type {
  OwnedPresentation,
  PreferenceResult,
  ViewPresentation,
} from "../presentation/index.js";
import type { Query, ResultWindow, Slice } from "../query/index.js";
import type { Schema, SchemaFieldDefinition } from "../schema/index.js";
import type { DataViewsSnapshot } from "../snapshot/index.js";
import type { SourceCapabilities } from "../source/index.js";
import type { QueryIssue } from "../wire/index.js";

/**
 * One saved view, resolved for this viewer: a snapshot of the collection —
 * its query stored verbatim as text written with `encodeQuery` and a null
 * window, canonical (`status=failed`), so
 * comparing texts tells whether the live query differs from the view; and
 * the arrangement in force when it was created, empty for none — with the
 * view's identity and revision.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type SavedView = DataViewsSnapshot & {
  readonly id: string;
  readonly name: string;
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
 * A view to create: its identity and the snapshot it keeps. The caller
 * mints the id, so retrying a creation whose response was lost finds the
 * view instead of duplicating it.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ViewDraft = Pick<SavedView, "id" | "name"> & DataViewsSnapshot;

/**
 * Changes to a saved view; a field left out keeps its value. Strict on
 * purpose: a field written `undefined` would be applied, not skipped. The
 * arrangement a view was created with is never changed: saving writes the
 * query alone.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ViewChanges = {
  readonly name?: string;
  readonly query?: string;
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
 * now: read it again, save as a new view, or overwrite it by passing it back.
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
 * A scoped view store. Its scope — database, collection and partition —
 * is fixed when it is constructed, so no call names it. Storage failures
 * reject; outcomes of the saved-view contract resolve. It keeps the views
 * and the viewer's pins; the viewer's arrangement is the presentation
 * store's, which the same object may also implement.
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
  /**
   * Remove a view with its pin, at the revision given. A store that also
   * keeps the presentation removes the view's own preferences with it.
   */
  readonly remove: (view: ViewRevision) => Promise<ViewRemoveResult>;
  /** Pin a view for this viewer; pinning twice is pinning once. */
  readonly pin: (id: string) => Promise<PreferenceResult>;
  readonly unpin: (id: string) => Promise<PreferenceResult>;
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
 * A saved-view command a collection runs.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ViewCommand = "open" | "save" | "save-as" | "rename" | "remove";

/**
 * How a saved-view command ended. `invalid` is a name refused before
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
 * An outcome a command settles to: never a refused name.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ViewSettledOutcome = Exclude<
  ViewOutcome,
  { readonly status: "invalid" }
>;

/**
 * The latest saved-view command: in flight, or settled with its outcome. A
 * refused name is never one: the caller shows it where the name was given.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ViewCommandState =
  | { readonly command: ViewCommand; readonly status: "pending" }
  | {
      readonly command: ViewCommand;
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
   * The latest command, or null before the first and after a revert while
   * none is running.
   */
  readonly command: ViewCommandState | null;
};

/**
 * A collection's saved views over the store its provider was given: which
 * one is open, whether the query has moved from it, and the commands on
 * it. Commands run one at a time, in call order. A store that rejects
 * settles as `failed`; a state listener that throws rejects that command
 * alone. A command still in flight when the generation moves answers its
 * caller and changes nothing.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type SavedViews = {
  readonly state: ReadonlyChannel<ViewsState>;
  /**
   * Read the store and hear its changes until the release is called. Nothing
   * reads the store before, so a server render stays `idle`; a React host
   * observes from an effect.
   */
  readonly observe: () => () => void;
  /**
   * Read the views again. While they cannot be listed, a view the URL names
   * stays named and unopened; the listing that succeeds opens it, or drops an
   * id no view answers to.
   */
  readonly refresh: () => void;
  /**
   * Apply a view's query on the first page and make it the open view. A
   * query the collection cannot read whole is refused, and the live query is
   * kept.
   */
  readonly open: (id: string) => Promise<ViewOutcome>;
  /** Apply the open view's query again, on the first page. */
  readonly revert: () => void;
  /**
   * Save the live query into the open view, provided the view is unchanged
   * since it was read. After a conflict the stored view is the open one, so
   * saving again overwrites it. The presentation is not saved: a view keeps
   * the arrangement it was created with.
   */
  readonly save: () => Promise<ViewOutcome>;
  /**
   * Save the live query, with the arrangement in force, as a new view, and
   * open it. A creation whose outcome never arrived is retried under the
   * same id. A name that is empty, already another view's, or not checkable
   * because the views are not listed, is refused as `invalid` before
   * anything is written.
   */
  readonly saveAs: (name: string) => Promise<ViewOutcome>;
  /** Rename the open view, refusing a name as `saveAs` does. */
  readonly rename: (name: string) => Promise<ViewOutcome>;
  /** Delete the open view. The live query stays. */
  readonly remove: () => Promise<ViewOutcome>;
};

/**
 * How the saved views move their host: a view opened, which is a step Back
 * returns from; a view reverted to; or a view left, its id dropped.
 */
export type ViewAdoptionCause = "view" | "revert";

/** The query authority the views read and drive: their provider's. */
export type SavedViewsHost = {
  /** The schema a stored query is read against. */
  readonly schema: Schema<readonly SchemaFieldDefinition[]>;
  /** What the source can execute; a stored clause outside it is refused. */
  readonly capabilities: SourceCapabilities;
  /** The live query and window, which "modified" is derived from. */
  readonly state: ReadonlyChannel<DataViewsState<object>>;
  /**
   * The saved view the host has open — the location's `view` — or null: on
   * load, and after Back, the id the session opens from its listing.
   */
  readonly view: ReadonlyChannel<string | null>;
  /**
   * Every move of the host's query and open view, heard once each move has
   * landed whole: what the session follows, so a move of both is one
   * notification and never two.
   */
  readonly transitions: Pick<ReadonlyChannel<unknown>, "subscribe">;
  /**
   * Adopt a query and window together with the open view, null for none, as
   * one move: one write, one entry of history at most.
   */
  readonly adopt: (
    query: Query,
    cause: ViewAdoptionCause,
    view: string | null,
  ) => void;
};

/** Configuration of one provider's saved views. */
export type SavedViewsConfig = {
  readonly host: SavedViewsHost;
  readonly store: ViewStore;
  /** The presentation the session shows the open view to, and snapshots on save-as. */
  readonly presentation: OwnedPresentation;
};

/** The provider's views, with what only the provider calls. */
export type OwnedSavedViews = SavedViews & {
  /** Forget the open view, as a reset returns the query to where the provider started. */
  readonly forget: () => void;
};

/** A stored query as this collection reads it: its slice, and what it refuses. */
export type StoredQuery = {
  readonly slice: Slice;
  readonly issues: readonly QueryIssue[];
};

/**
 * What a command settles to: its outcome, and how to apply it to the views
 * — which runs only while the generation it was made in is still current.
 */
export type ViewSettlement = {
  readonly outcome: ViewSettledOutcome;
  readonly apply?: () => Partial<ViewsState>;
};

/**
 * What a command does when its turn comes: refuse at once with an outcome,
 * or write.
 */
export type PreparedCommand = ViewOutcome | (() => Promise<ViewSettlement>);

/**
 * The session's command queue: one command at a time, in call order, each
 * to an outcome, published as it goes.
 */
export type ViewCommandQueue = {
  readonly run: (
    command: ViewCommand,
    prepare: () => PreparedCommand,
  ) => Promise<ViewOutcome>;
  /** Begin a new generation: a command still in flight changes nothing. */
  readonly abandon: () => void;
};

/** The commands of the session: what runs against the store. */
export type ViewCommands = Pick<
  SavedViews,
  "open" | "save" | "saveAs" | "rename" | "remove"
>;

/**
 * Configuration of the session's commands: the ports they run over, the
 * session's state and queue, and the moves a settled command makes.
 */
export type ViewCommandsConfig = Pick<
  SavedViewsConfig,
  "host" | "store" | "presentation"
> & {
  readonly state: ReadonlyChannel<ViewsState>;
  readonly run: ViewCommandQueue["run"];
  /** Set the query the open view was opened or saved at, or none. */
  readonly setBaseline: (slice: Slice | null) => void;
  /** The listed views with this one in them, as the store now has it. */
  readonly listWith: (view: SavedView) => readonly SavedView[];
  /** Drop a view: its identity goes, from the host too; the query stays. */
  readonly dropView: (id: string) => Partial<ViewsState>;
  /** The first page of the current page size. */
  readonly readFirstPage: () => ResultWindow;
};

/** Configuration of one command queue. */
export type ViewCommandQueueConfig = {
  /** Publish a change to the views' state. */
  readonly publish: (changed: Partial<ViewsState>) => void;
};
