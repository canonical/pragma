/**
 * Hook domain types for the DataViews domain: every hook's result, and the
 * props of the hooks that take a config object. The witness hooks and the
 * value hook take their one input positionally — the collection, a channel,
 * a handle — so they declare no props type of their own.
 */
import type {
  DataViewsProvider,
  DataViewsState,
  EmptyOr,
  Facet,
  FilterFeedback,
  FilterHandles,
  PredicateOperand,
  Query,
  RowRecord,
  SchemaFieldDefinition,
  SortTerm,
  SourceRefusal,
} from "@canonical/dataviews-core";
import type { RefObject, ToggleEvent } from "react";
import type { AnnouncerHandle } from "../../../common/index.js";
import type { ContextOptions, DataViewsProps } from "../types.js";

/**
 * What the root's state hook takes: the root's props less its children,
 * which the root renders itself.
 */
export type UseProviderStateProps<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = Omit<DataViewsProps<TFields, TRow>, "children">;

/**
 * What the root's state hook hands the root: the value its context carries,
 * and the ref its announcer's region is rendered with, which no part reads.
 */
export type UseProviderStateResult = {
  readonly value: ContextOptions;
  readonly announcer: RefObject<AnnouncerHandle | null>;
};

/** What a connected part reads off the enclosing root: its value. */
export type UseDataViewsRootResult = ContextOptions;

/** What the applied-search hook takes: the provider whose search it reads. */
export type UseAppliedSearchProps = {
  readonly provider: DataViewsProvider<readonly SchemaFieldDefinition[]>;
};

/** What the applied-search hook returns: the applied search, empty for none. */
export type UseAppliedSearchResult = string;

/** What the applied-sort hook takes: the provider whose ordering it reads. */
export type UseAppliedSortProps = {
  readonly provider: DataViewsProvider<readonly SchemaFieldDefinition[]>;
};

/**
 * What the applied-sort hook returns: the applied terms, at one identity while
 * they read the same.
 */
export type UseAppliedSortResult = readonly SortTerm[];

/** What the restricted-fields hook takes: the provider whose query it reads. */
export type UseRestrictedFieldsProps = {
  readonly provider: DataViewsProvider<readonly SchemaFieldDefinition[]>;
};

/**
 * What the restricted-fields hook returns: how many predicates the applied
 * query holds on each field it restricts, at one identity while that reads
 * the same.
 */
export type UseRestrictedFieldsResult = ReadonlyMap<string, number>;

/** What the facets hook takes: the provider whose result's facets it reads. */
export type UseFacetsProps = {
  readonly provider: DataViewsProvider<readonly SchemaFieldDefinition[]>;
};

/** What the facets hook returns, each keyed by field. */
export type UseFacetsResult = {
  /**
   * The facets of the result answering the applied query, or null while no
   * result answers it: what counts and ranges are read from.
   */
  readonly answered: Readonly<Record<string, Facet>> | null;
  /**
   * The facets the latest result answered, whichever query it answered, or
   * null before any: what the server's options are listed from, so they stay
   * until a newer result lands.
   */
  readonly latest: Readonly<Record<string, Facet>> | null;
};

/**
 * What the More filters pin takes: the marks a pin is placed under, and the
 * fields shown by default, read as the disclosure opens.
 */
export type UseMoreFiltersPinProps = {
  /** The primary marks, joined into the one key a pin is placed under. */
  readonly marks: string;
  /** The fields shown by default as things stand, read as the disclosure opens. */
  readonly listShownFields: () => readonly string[];
};

/** What the More filters pin returns. */
export type UseMoreFiltersPinResult = {
  /**
   * The fields placed outside while the disclosure is open; null while it is
   * closed, or when the marks moved since it opened.
   */
  readonly pinned: ReadonlySet<string> | null;
  /** The disclosure's element, read in the commit where the filters hydrate. */
  readonly detailsRef: RefObject<HTMLDetailsElement | null>;
  /** Place or release the pin as the disclosure toggles. */
  readonly handleToggle: (event: ToggleEvent<HTMLDetailsElement>) => void;
};

/** What the destination hook takes: the provider, and the query a state leads to. */
export type UseDestinationProps = {
  readonly provider: DataViewsProvider<readonly SchemaFieldDefinition[]>;
  /** The destination's query, from the applied state; held by identity. */
  readonly destinationOf: (state: DataViewsState<object>) => Query;
};

/** What the destination hook returns: the spelled parameters, or null without a location. */
export type UseDestinationResult = string | null;

/**
 * The typed collection scope returned by useDataViews: the provider's own
 * members a child of a root may read and command, plus the root's filter
 * handles. Derived, so a signature is written once; `observe` and `reset`
 * are left out, because the root observes for every child and a child that
 * reset the collection would be resetting every other child's too.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type UseDataViewsResult<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
> = Pick<
  DataViewsProvider<TFields, TRow>,
  | "collection"
  | "capabilities"
  | "state"
  | "rows"
  | "issues"
  | "selection"
  | "views"
  | "presentation"
  | "navigateWindow"
  | "setSort"
  | "setSearch"
  | "setGroup"
  | "setCollapsed"
  | "refresh"
  | "refusals"
  | "runAction"
> & {
  /** This root's filter handles, one per field and legal operator. */
  readonly filters: FilterHandles<TFields>;
};

/**
 * What `useDataViewsFilter` returns: one filter of the root, read and edited.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type UseDataViewsFilterResult<TApplied> = {
  /** The text in the filter's input, as last edited. */
  readonly input: string;
  /** The filter's applied semantic value, or empty when no predicate stands. */
  readonly applied: EmptyOr<TApplied>;
  /** What the control shows beside its input: applied, incomplete, or why not. */
  readonly feedback: FilterFeedback;
  /** Edit through the input; an edit that cannot apply keeps the standing predicate. */
  readonly edit: (input: string) => void;
  /** Set the semantic operands directly, as a multi-value control does. */
  readonly set: (
    operands: readonly PredicateOperand[],
  ) => readonly SourceRefusal[];
  /** Remove the filter's predicate, distinct from an empty edit. */
  readonly clear: () => readonly SourceRefusal[];
};

/** What `useFilterHandle` returns: one filter handle, read and edited. */
export type UseFilterHandleResult<TApplied> =
  UseDataViewsFilterResult<TApplied>;
