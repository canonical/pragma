/**
 * The bounded collection grammar: AND-ed filter predicates, text search,
 * ordered sort terms and one grouping field.
 */

/** Bounded predicate operators. */
export type PredicateOperator = "eq" | "gte" | "lte" | "isSet";

/** A semantic operand value. Field metadata owns coercion; core never guesses. */
export type PredicateOperand = string | number | boolean | null;

/**
 * One filter clause, addressed by its field and operator. `eq` operands are
 * a non-empty set; `gte` and `lte` carry exactly one operand; `isSet`
 * carries none. Numbers must be finite.
 */
export type Predicate = {
  readonly field: string;
  readonly operator: PredicateOperator;
  readonly operands: readonly PredicateOperand[];
};

/** Sort direction of a single ordered term. */
export type SortDirection = "asc" | "desc";

/** One sort term; term order carries sort precedence and is never reordered. */
export type SortTerm = {
  readonly field: string;
  readonly direction: SortDirection;
};

/**
 * The applied collection query: filters, text search, ordering and grouping,
 * independent of renderer presentation and the result window.
 */
export type Slice = {
  readonly filter: readonly Predicate[];
  readonly search: string | null;
  readonly sort: readonly SortTerm[];
  readonly group: string | null;
};

/** One-based offset over the result set. */
export type ResultWindow = {
  readonly page: number;
  readonly size: number;
};

/** An addressed query command. `navigateWindow` addresses the window only. */
export type QueryCommand =
  | {
      readonly kind: "replacePredicate";
      readonly predicate: Predicate;
    }
  | {
      readonly kind: "removePredicate";
      readonly field: string;
      readonly operator: PredicateOperator;
    }
  | { readonly kind: "replaceSearch"; readonly search: string }
  | { readonly kind: "replaceSort"; readonly sort: readonly SortTerm[] }
  | { readonly kind: "setGroup"; readonly group: string | null }
  | {
      readonly kind: "navigateWindow";
      readonly page?: number;
      readonly size?: number;
    };

/** Outcome of applying a query command: accepted change or explicit rejection. */
export type QueryCommandResult =
  | {
      readonly status: "accepted";
      readonly slice: Slice;
      readonly window: ResultWindow;
      /** True when the semantic query changed (dirty comparisons, history). */
      readonly queryChanged: boolean;
      /** True when the result window changed (window is part of request identity). */
      readonly windowChanged: boolean;
    }
  | {
      readonly status: "rejected";
      readonly reason: string;
      readonly slice: Slice;
      readonly window: ResultWindow;
    };
