/**
 * The presentation contract: the arrangement in force — column widths,
 * order and visibility as keyed JSON — layered from the columns' declared
 * defaults, the viewer's default arrangement, the open view's saved
 * arrangement and the viewer's own changes to it; the store port that keeps
 * the viewer's layers; the record the provider owns over them, with the
 * layers and the write-behind it is built from; and the columns a renderer
 * declares and the arrangement places.
 */

import type { ReadonlyChannel } from "../observable/index.js";

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
 * Presentation as keyed JSON values — widths, order, visibility and the
 * like — as a view saves it and as viewer preferences hold it.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ViewPresentation = { readonly [key: string]: JsonValue };

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
 * The outcome of a preference write: `missing` when its view is not there,
 * which is final — a change to a view that is gone is dropped, not kept.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type PreferenceResult =
  | { readonly status: "saved" }
  | { readonly status: "missing" };

/**
 * A scoped presentation store: one record per key, per target. Its scope —
 * collection and viewer — is fixed when it is constructed, so no call
 * names it. The IndexedDB view store implements it; an application may pass
 * a `localStorage`-backed store or its own server preferences instead, or
 * nothing, in which case the presentation lives in memory for the session.
 *
 * What an implementation guarantees: `readPresentation` resolves the keys
 * stored at the target, and an empty record for a target with none or a
 * view that does not exist; `patchPresentation` applies every key of the
 * patch atomically, the last committed write winning for one key only, so
 * patches of different keys never overwrite each other, and a key patched
 * to `undefined` is removed; `patchPresentation` resolves `missing` for a
 * view the store does not have, whereupon the presentation drops that
 * view's changes and retries nothing; storage failures reject, and never
 * resolve as saved; `subscribe` hears every change, here or in another tab,
 * before the write that made it resolves, so a read begun after a write was
 * called sees it.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type PresentationStore = {
  /** The preferences at a target; empty for a view that does not exist. */
  readonly readPresentation: (
    target: PresentationTarget,
  ) => Promise<ViewPresentation>;
  /**
   * Apply a patch atomically. The last committed write wins for one key
   * only: patches of different keys never overwrite each other. Resolves
   * `missing` for a view the store does not have; the presentation then
   * drops that view's changes and retries nothing.
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
};

/**
 * The presentation in force, as a renderer reads it.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type PresentationState = {
  /**
   * The arrangement in force: the viewer's default arrangement, under the
   * open view's saved presentation, under the viewer's own changes to that
   * view, merged key by key. A renderer's declared defaults fill every key
   * left out.
   */
  readonly presentation: ViewPresentation;
  /**
   * Why presentation changes are not being read or saved, or null. Never
   * set without a store: the in-memory presentation is kept for the session
   * and claims nothing about durability.
   */
  readonly presentationReason: string | null;
};

/**
 * A collection's presentation: the one authority for what is presentation
 * — column widths, order and visibility — over the store its provider was
 * given, or in memory for the session without one. Changes apply at once
 * and are written behind, batched per target; a change not yet sent when a
 * read began, or whose write failed, wins over that read.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type Presentation = {
  readonly state: ReadonlyChannel<PresentationState>;
  /**
   * Read the store and hear its changes until the release is called; the
   * last release writes every change still gathering. Nothing reads the
   * store before, so a server render stays at the declared arrangement.
   */
  readonly observe: () => () => void;
  /**
   * Read the preferences again, and write again the changes whose write
   * failed.
   */
  readonly refresh: () => void;
  /**
   * Change the arrangement: the open view's own preferences, or the default
   * arrangement when none is open. Applied at once and saved behind; a save
   * that fails is reported on `presentationReason`, never undone. A key set
   * to undefined is removed, so the layer beneath shows through.
   */
  readonly arrange: (patch: PresentationPatch) => void;
};

/**
 * A saved view as the presentation layers it: its identity and the
 * arrangement it was saved with. The saved-view session hands this over
 * whenever the open view changes; the presentation never reads the views.
 */
export type ShownView = {
  readonly id: string;
  readonly presentation: ViewPresentation;
};

/** The provider's presentation, with what only the provider and its views call. */
export type OwnedPresentation = Presentation & {
  /**
   * Layer the open view, or none; another view, or none, lets go of an
   * arrangement restored under a view. Its saved presentation goes under the
   * viewer's own preferences for it, which are read from the store when
   * the view's identity changes while observed; the same view revised
   * keeps them, and a view shown again keeps the changes made to it before.
   */
  readonly show: (view: ShownView | null) => void;
};

/** Configuration of one provider's presentation. */
export type PresentationConfig = {
  /** Where the viewer's layers live; in memory for the session when left out. */
  readonly store?: PresentationStore | undefined;
  /** The arrangement a snapshot put back; none when left out. */
  readonly restored?: RestoredArrangement | undefined;
};

/**
 * An arrangement a snapshot put back, with the saved view it was in force
 * under. With no view it is the default arrangement: the store decides it
 * once read, and without a store it is kept for the session. With a view it
 * is that view's arrangement as it was drawn, shown until the view's own
 * preferences are read or another view, or none, is shown, whereupon the
 * view's own layers take over and nothing of it becomes the default. Without
 * a store it is kept as that view's own preferences for the session.
 */
export type RestoredArrangement = {
  readonly view: string | null;
  readonly presentation: ViewPresentation;
};

/**
 * One target's preferences, with the change that last wrote each key here
 * and the keys whose last write failed.
 */
export type PreferenceLayer = {
  /** The values, as the viewer last changed them or the store last read. */
  readonly values: Readonly<Record<string, JsonValue>>;
  /** Change keys at once; the change is numbered for the next read to weigh. */
  readonly change: (patch: PresentationPatch, token: number) => void;
  /**
   * Take a read into the layer. A key not yet sent when the read began,
   * sent but not yet answered, or whose write failed keeps its value here:
   * the read cannot know it.
   */
  readonly settle: (read: ViewPresentation, since: number) => void;
  /** The change that last wrote a key, or undefined for a key never changed. */
  readonly readChangeToken: (key: string) => number | undefined;
  /** Mark keys as sent to the store and not yet answered. */
  readonly markSent: (keys: readonly string[]) => void;
  /** Mark keys as written: their earlier failure, if any, is over. */
  readonly markWritten: (keys: readonly string[]) => void;
  /** Mark keys as failed to write; they are kept and reported until retried. */
  readonly markFailed: (keys: readonly string[]) => void;
  /** The keys whose last write failed, with their values, as a patch. */
  readonly listUnsaved: () => PresentationPatch;
  /** Whether any key's last write failed. */
  readonly hasFailed: () => boolean;
};

/** One target's layer with the target it is written to. */
export type KeptLayer = {
  readonly layer: PreferenceLayer;
  readonly target: PresentationTarget;
};

/** Configuration of one preference writer: the store and what to tell after a write settles. */
export type PreferenceWriterConfig = {
  readonly store: PresentationStore;
  /** Publish the presentation after a write settled, well or badly. */
  readonly publish: () => void;
  /**
   * A view the store no longer has was written to: its layer has nothing
   * left to keep, and nothing to retry.
   */
  readonly forget: (target: PresentationTarget) => void;
};

/**
 * The write-behind of one presentation: changes applied at once to their
 * layer, gathered by target and written behind.
 */
export type PreferenceWriter = {
  /** Change a target's preferences at once, and write the change behind. */
  readonly persist: (kept: KeptLayer, patch: PresentationPatch) => void;
  /** Write every change gathered so far, each target's merged into one. */
  readonly flush: () => void;
  /** Write again every key of a layer whose last write failed. */
  readonly rewrite: (kept: KeptLayer) => void;
  /** The last change a flush has sent: what a read begun now cannot know past. */
  readonly flushed: number;
  /** Why the latest failed write failed, or empty before any. */
  readonly failure: string;
};

/**
 * A column as a renderer declares it, for the arrangement to order and
 * show: its identity and whether the viewer may hide it.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type DeclaredColumn = {
  readonly id: string;
  /** Whether the viewer may hide the column. Defaults to true. */
  readonly hideable?: boolean | undefined;
};

/**
 * One column as the arrangement in force places it: the column as it was
 * declared, in its order, hidden or shown, with the width the arrangement
 * holds for it or null.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ArrangedColumn<TColumn extends DeclaredColumn = DeclaredColumn> = {
  readonly column: TColumn;
  readonly hidden: boolean;
  /** The width the arrangement holds, unbounded; null for none usable. */
  readonly width: number | null;
};
