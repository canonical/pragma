/**
 * Hook domain types for the hooks every part shares: the value hook that
 * observes one channel, the cell hook a column's own renderer reads, whether
 * scripts have taken over, the focus a server's link hands to the button
 * replacing it, and the words a root speaks. Each hook declares its result
 * type, and its props type where it takes a config object, here.
 */

import type {
  DataViewsMessages,
  ReadonlyChannel,
  RowRecord,
} from "@canonical/dataviews-core";
import type { ReactNode, RefObject } from "react";
import type { AnnouncerHandle, AnnouncerTopic } from "../common/index.js";

/** What `useDataViewsValue` returns: the channel's current value, or the part `select` picks. */
export type UseDataViewsValueResult<T> = T;

/**
 * The cell scope returned by useDataViewsCell. Its channels are read-only.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type UseDataViewsCellResult<TRow extends object = RowRecord> = {
  /** The identity of the row the cell displays. */
  readonly rowId: string;
  /** The id of the column the cell renders. */
  readonly columnId: string;
  /** The whole record; watching it is broader than watching one field. */
  readonly record: ReadonlyChannel<TRow>;
  /** One channel per field the table observes, keyed by field name. */
  readonly fields: Readonly<Record<string, ReadonlyChannel<unknown>>>;
  /** Whether the row is in the collection's selection. */
  readonly selected: ReadonlyChannel<boolean>;
};

/** What `useHydrationFocusHandoff` takes: whether scripts have taken over. */
export type UseHydrationFocusHandoffProps = {
  readonly hydrated: boolean;
};

/**
 * What `useHydrationFocusHandoff` returns: the ref for the link a server
 * renders, and the ref for the button that replaces it once hydrated.
 */
export type UseHydrationFocusHandoffResult = {
  /** The link a server renders, attached only before hydration. */
  readonly link: RefObject<HTMLAnchorElement | null>;
  /** The button that replaces the link once hydrated, and takes its focus. */
  readonly button: RefObject<HTMLButtonElement | null>;
};

/**
 * What `useIsHydrated` returns: whether scripts have taken over the page —
 * false on the server and while hydrating, true after.
 */
export type UseIsHydratedResult = boolean;

/**
 * What `useMessages` returns: every message a root speaks, the application's
 * over the English record.
 */
export type UseMessagesResult = DataViewsMessages;

/** What `useStableValue` returns: the held value, while it equals the one given. */
export type UseStableValueResult<TValue> = TValue;

/** What `useStableCallback` returns: the latest callback behind one identity. */
export type UseStableCallbackResult<
  TArgs extends readonly unknown[],
  TResult,
> = (...args: TArgs) => TResult;

/** What `useAnnouncer` returns: a root's announcer, as the root renders and speaks through it. */
export type UseAnnouncerResult = {
  /** The ref the root renders its announcer's region with. */
  readonly ref: RefObject<AnnouncerHandle | null>;
  /**
   * Say an outcome that has no place on screen, through the region, under a
   * topic where the outcome has one latest answer; one identity for as long
   * as the root is mounted.
   */
  readonly announce: (message: ReactNode, topic?: AnnouncerTopic) => void;
};
