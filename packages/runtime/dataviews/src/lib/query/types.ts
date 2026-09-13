/**
 * The bounded collection grammar: AND-ed filter predicates, text search,
 * ordered sort terms and ordered grouping levels, plus the window those
 * results are read through.
 */

/**
 * Bounded predicate operators.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type PredicateOperator = "eq" | "gte" | "lte" | "isSet";

/**
 * A semantic operand value. Field metadata owns coercion; core never guesses.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type PredicateOperand = string | number | boolean | null;

/**
 * One filter clause, addressed by its field and operator. `eq` operands are
 * a non-empty set; `gte` and `lte` carry exactly one operand; `isSet`
 * carries none. Numbers must be finite.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type Predicate = {
  readonly field: string;
  readonly operator: PredicateOperator;
  readonly operands: readonly PredicateOperand[];
};

/**
 * Sort direction of a single ordered term.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type SortDirection = "asc" | "desc";

/**
 * One sort term; term order carries sort precedence and is never reordered.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type SortTerm = {
  readonly field: string;
  readonly direction: SortDirection;
};

/**
 * One grouping level. Levels nest in list order. Nothing executes a group
 * term yet: every source declares grouping unavailable, so a grouped query
 * is refused.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type GroupTerm = {
  readonly field: string;
};

/**
 * The key of one group at each level down to it: `["failed", "eu-west"]` is
 * the `eu-west` group inside the `failed` group.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type GroupPath = readonly PredicateOperand[];

/**
 * The applied collection query: filters, text search, ordering and
 * grouping, independent of renderer presentation and the result window.
 * Query-class throughout: saved with a view, and a difference marks a view
 * modified.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type Slice = {
  readonly filter: readonly Predicate[];
  readonly search: string | null;
  readonly sort: readonly SortTerm[];
  /** Ordered grouping levels; empty is ungrouped. */
  readonly group: readonly GroupTerm[];
};

/**
 * The visible portion of a result. Window-class throughout: part of request
 * identity, never part of a saved view, and never a reason a view is
 * modified.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type ResultWindow = {
  /** One-based page over the result set. */
  readonly page: number;
  readonly size: number;
  /**
   * Opaque token of this page's start, as the source handed it back with an
   * earlier page's `cursors`. Null on page one and for offset sources.
   * Cleared whenever `page` or `size` moves without a token of its own, so
   * a token never describes a page it was not minted for.
   */
  readonly cursor: string | null;
  /**
   * Groups whose rows are left out of the page and of `counts.pageable`.
   * Reset when grouping changes, kept across paging and filtering. Nothing
   * collapses while no source declares grouping, so a non-empty value is
   * refused.
   */
  readonly collapsed: readonly GroupPath[];
};

/**
 * Where a collection is: its slice and its window, always adopted together.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type Query = {
  readonly slice: Slice;
  readonly window: ResultWindow;
};

/**
 * The window members `navigateWindow` addresses. `collapsed` moves with
 * `setCollapsed` instead, so paging and collapsing stay separate gestures.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type WindowNavigation = Partial<Omit<ResultWindow, "collapsed">>;

/**
 * An addressed query command. `set*` replaces a whole value and the caller
 * computes it; `navigateWindow` and `setCollapsed` address the window only.
 */
export type QueryCommand =
  | {
      readonly kind: "setPredicate";
      readonly predicate: Predicate;
    }
  | {
      readonly kind: "removePredicate";
      readonly field: string;
      readonly operator: PredicateOperator;
    }
  | { readonly kind: "setSearch"; readonly search: string }
  | { readonly kind: "setSort"; readonly sort: readonly SortTerm[] }
  | { readonly kind: "setGroup"; readonly group: readonly GroupTerm[] }
  | {
      readonly kind: "setCollapsed";
      readonly collapsed: readonly GroupPath[];
    }
  | ({ readonly kind: "navigateWindow" } & WindowNavigation);

/** Outcome of applying a query command: accepted change or explicit rejection. */
export type QueryCommandResult =
  | (Query & {
      readonly status: "accepted";
      /** True when the semantic query changed (dirty comparisons, history). */
      readonly sliceChanged: boolean;
      /** True when the window changed (window is part of request identity). */
      readonly windowChanged: boolean;
    })
  | (Query & {
      readonly status: "rejected";
      readonly reason: string;
    });
