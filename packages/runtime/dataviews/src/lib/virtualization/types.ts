import type { ReadonlyChannel } from "../observable/index.js";
import type { DisplayEntry, DisplayEntryKind } from "../rows/index.js";

/** Configuration of one table's virtual range. */
export type VirtualRangeConfig = {
  /**
   * Each entry kind's size before it is measured, in pixels. An estimate
   * places an entry and never clips one: every entry is measured once it
   * is mounted. Keyed by kind, so no kind of entry joins without one.
   */
  readonly estimates: Readonly<Record<DisplayEntryKind, number>>;
};

/** One run of consecutive entries to mount. */
export type MountedRun = {
  /** The position of the run's first entry. */
  readonly start: number;
  /** The position after the run's last entry. */
  readonly end: number;
  /** The space of the entries skipped before the run, in pixels. */
  readonly before: number;
};

/** Which entries to mount, and the space the others take. */
export type MountedRange = {
  /** Runs of consecutive entries, in display order. */
  readonly runs: readonly MountedRun[];
  /** The space of the entries after the last run, in pixels. */
  readonly after: number;
};

/**
 * One table's virtual range: which of its entries to mount for a viewport,
 * published as a channel that notifies only when that answer changes.
 *
 * Everything is keyed by entry id — measurements, the scroll anchor and
 * the retained entry — so an entry that moves or leaves takes nothing that
 * belongs to another with it. Positions are the current entries' only.
 *
 * The one record on this surface that *is* its channel rather than
 * publishing one under `state`. A range has exactly one thing to observe
 * and its commands only ever change that one thing, so a `state` member
 * would name the record twice; it reads as a channel with commands, which
 * is what a renderer holds it as.
 */
export type VirtualRange = ReadonlyChannel<MountedRange> & {
  /**
   * Replace the entries. Notifies nobody: whoever sets them is rendering
   * them. Measurements of entries that left are dropped, so retention is
   * bounded by the entries displayed. The anchor keeps its place when
   * entries are added or removed before it, and the viewport stays put
   * when the anchor itself left. Returns how far to scroll for that.
   */
  readonly setEntries: (entries: readonly DisplayEntry[]) => number;
  /**
   * Place the viewport, in the entries' own coordinates: where it starts,
   * and how much it shows. The entry at its start becomes the anchor,
   * except at the very top, where entries added before it are shown rather
   * than scrolled past.
   */
  readonly setViewport: (start: number, size: number) => void;
  /**
   * Record mounted entries' measured sizes, by entry id. Returns how far
   * to scroll so the anchor stays where it is on screen.
   */
  readonly measure: (
    sizes: Iterable<readonly [id: string, size: number]>,
  ) => number;
  /**
   * Forget the measurements of unmounted entries — those named, or `"all"`
   * when a change such as a new width outdates every one. Mounted entries
   * keep theirs: they are measured again when they change. Returns how far
   * to scroll to keep the anchor in place.
   */
  readonly invalidate: (ids: Iterable<string> | "all") => number;
  /**
   * Keep one entry mounted, with a neighbour on each side, wherever the
   * viewport is; null keeps none. An id not displayed is ignored.
   */
  readonly retain: (id: string | null) => void;
};
