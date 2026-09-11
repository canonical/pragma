/**
 * The saved-view contract: a named query with optional presentation,
 * versioned by revision, and the viewer's own preferences — pins and
 * presentation patches — kept apart from it. Any store may implement it;
 * the IndexedDB store is the local-first one shipped here.
 */

/** A JSON value. */
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
 */
export type ViewPresentation = { readonly [key: string]: JsonValue };

/** One saved view, resolved for this viewer. */
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

/** The view an edit is made against: its id and the revision last read. */
export type ViewRevision = Pick<SavedView, "id" | "revision">;

/**
 * A view to create. The caller mints the id, so retrying a creation whose
 * response was lost finds the view instead of duplicating it.
 */
export type ViewDraft = {
  readonly id: string;
  readonly name: string;
  readonly query: string;
  /** Presentation saved with the view; left out for none. */
  readonly presentation?: ViewPresentation;
};

/** Changes to a saved view; a field left out keeps its value. */
export type ViewChanges = {
  readonly name?: string;
  readonly query?: string;
  /** Null removes the saved presentation. */
  readonly presentation?: ViewPresentation | null;
};

/**
 * A stored record this client cannot read — corrupt, or written in a
 * record version it does not know. It is reported and never overwritten.
 */
export type UnreadableView = {
  readonly id: string;
  readonly reason: string;
};

/** Every view in the store's scope. */
export type ViewList = {
  readonly views: readonly SavedView[];
  readonly unreadable: readonly UnreadableView[];
};

/** One view looked up by id. */
export type ViewGetResult =
  | { readonly status: "found"; readonly view: SavedView }
  | { readonly status: "missing" }
  | { readonly status: "unreadable"; readonly reason: string };

/**
 * The outcome of a creation. A conflict is a different view already under
 * the id; the same creation arriving again is `saved`.
 */
export type ViewCreateResult =
  | { readonly status: "saved"; readonly view: SavedView }
  | { readonly status: "conflict"; readonly view: SavedView }
  | { readonly status: "unreadable"; readonly reason: string };

/**
 * The outcome of an update. A conflict carries the view as it is stored
 * now: reload it, save as a new view, or overwrite it by passing it back.
 */
export type ViewUpdateResult =
  | { readonly status: "saved"; readonly view: SavedView }
  | { readonly status: "conflict"; readonly view: SavedView }
  | { readonly status: "missing" }
  | { readonly status: "unreadable"; readonly reason: string };

/** The outcome of a removal; removing a view already gone succeeds. */
export type ViewRemoveResult =
  | { readonly status: "removed" }
  | { readonly status: "conflict"; readonly view: SavedView }
  | { readonly status: "unreadable"; readonly reason: string };

/** The outcome of a preference write: `missing` when its view is not there. */
export type PreferenceResult =
  | { readonly status: "saved" }
  | { readonly status: "missing" };

/**
 * Where presentation preferences apply: the collection's default
 * arrangement, or one view's own, which is distinct from the presentation
 * saved with the view.
 */
export type PresentationTarget = "default" | { readonly view: string };

/**
 * Preference keys to set, each to a JSON value, or to remove when
 * undefined. JSON drops undefined, so a REST-backed store sends removals
 * explicitly.
 */
export type PresentationPatch = {
  readonly [key: string]: JsonValue | undefined;
};

/**
 * A scoped view store. Its scope — database, collection and partition —
 * is fixed when it is constructed, so no call names it. Storage failures
 * reject; outcomes of the saved-view contract resolve.
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
   * how. The storage stays the authority.
   */
  readonly subscribe: (listener: () => void) => () => void;
  /** Detach: close the storage, drop listeners; later calls reject. */
  readonly dispose: () => void;
};
