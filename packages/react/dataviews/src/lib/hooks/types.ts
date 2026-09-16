/**
 * Hook domain types for the hooks every part shares: the value hook that
 * observes one channel, the cell hook a column's own renderer reads, whether
 * scripts have taken over, the focus a server's link hands to the button
 * replacing it, and the words a root speaks. Each hook declares its result
 * type, and its props type where it takes a config object, here.
 */

import type {
  DataViewsMessages,
  DataViewsProvider,
  Facet,
  ReadonlyChannel,
  RowRecord,
  SchemaFieldDefinition,
  Selection,
} from "@canonical/dataviews-core";
import type { RowScopes } from "@canonical/dataviews-core/bindings";
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

/** What `useSelectAllOnPage` takes: the selection, and the page it acts on. */
export type UseSelectAllOnPageProps = {
  readonly selection: Selection;
  /** The identities on the page — the scope the control acts on. */
  readonly ids: readonly string[];
};

/**
 * What `useSelectAllOnPage` returns: whether every record on the page is
 * selected, whether only some are, and the toggle that selects or clears them
 * all.
 */
export type UseSelectAllOnPageResult = {
  /** Every identity on the page is selected, and the page has at least one. */
  readonly checked: boolean;
  /** Some identities on the page are selected, but not all. */
  readonly mixed: boolean;
  /** Clear the page's identities when checked, otherwise add them all. */
  readonly toggle: () => void;
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

/** What the answered-facets hook takes: the provider whose result answers. */
export type UseAnsweredFacetsProps<
  TFields extends
    readonly SchemaFieldDefinition[] = readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = {
  readonly provider: DataViewsProvider<TFields, TRow>;
};

/** The facets answering the applied query, keyed by field, or null while none does. */
export type UseAnsweredFacetsResult = Readonly<Record<string, Facet>> | null;

/** What the facets hook takes: the provider whose result carries the facets. */
export type UseFacetsProps<
  TFields extends
    readonly SchemaFieldDefinition[] = readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = UseAnsweredFacetsProps<TFields, TRow>;

/** What the facets hook returns, each keyed by field. */
export type UseFacetsResult = {
  /**
   * The facets of the result answering the applied query, or null while no
   * result answers it: what counts and ranges are read from.
   */
  readonly answered: UseAnsweredFacetsResult;
  /**
   * The facets the latest result answered, whichever query it answered, or
   * null before any: what the server's options are listed from, so they stay
   * until a newer result lands.
   */
  readonly latest: Readonly<Record<string, Facet>> | null;
};

/**
 * What `useMessages` returns: every message a root speaks, the application's
 * over the English record.
 */
export type UseMessagesResult = DataViewsMessages;

/**
 * The row-scope registry `useRowScopes` mints for one renderer. Its inputs
 * are positional — a provider and the field names it observes — so it
 * declares no props type of its own.
 */
export type UseRowScopesResult<TRow extends object = RowRecord> =
  RowScopes<TRow>;

/**
 * What `useStableCallback` answers: the caller's function behind one
 * identity. Positional, so it declares no props type of its own.
 */
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

/**
 * What `useStableValue` answers: the value held at one reference while it
 * says the same. Positional, so it declares no props type of its own.
 */
export type UseStableValueResult<TValue> = TValue;
