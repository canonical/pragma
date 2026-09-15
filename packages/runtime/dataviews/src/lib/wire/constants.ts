/**
 * The names of the flat, form-compatible wire grammar: the delimiter
 * between a field and its operator, the parameters the grammar writes and
 * reserves, and the operators written with the delimiter.
 */

import type { PredicateOperator } from "../query/index.js";

/** The delimiter between a field's wire name and its operator. */
export const OPERATOR_DELIMITER = "__";

/**
 * The parameters the grammar writes for every collection. Collapse is
 * window-class but has no spelling: a reload expands every group.
 */
export const WRITTEN_QUERY_KEYS: readonly string[] = Object.freeze([
  "q",
  "sort",
  "group",
  "page",
  "size",
  "cursor",
]);

/**
 * The annotation naming the saved view a location has open. It asks the source
 * for nothing and never marks the view modified; the grammar reserves it, and
 * `readOpenView` reads it.
 */
export const VIEW_KEY = "view";

/**
 * Parameter names the grammar reserves: those it writes, plus the
 * annotation names it leaves to the host. A field's wire name may not
 * collide with one — the query would be ambiguous.
 */
export const RESERVED_QUERY_KEYS: readonly string[] = Object.freeze([
  ...WRITTEN_QUERY_KEYS,
  "as",
  VIEW_KEY,
  "item",
]);

/**
 * The operators a key may carry after the delimiter. `isAny` is written as
 * the bare field name, and read under both spellings as one predicate.
 */
export const SUFFIXED_OPERATORS = Object.freeze([
  "isAny",
  "isNone",
  "gte",
  "lte",
  "isSet",
  "contains",
  "startsWith",
] as const satisfies readonly PredicateOperator[]);
