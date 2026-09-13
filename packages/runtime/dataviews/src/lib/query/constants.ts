/**
 * What the query grammar fixes: the operands each operator carries, and
 * the seed window and empty slice every collection starts from.
 */

import type { PredicateOperator, ResultWindow, Slice } from "./types.js";

/**
 * How many operands each operator carries: `eq` a non-empty set, `gte` and
 * `lte` exactly one, `isSet` none.
 */
export const OPERATOR_ARITY: Readonly<
  Record<PredicateOperator, "none" | "one" | "many">
> = Object.freeze({
  eq: "many",
  gte: "one",
  lte: "one",
  isSet: "none",
});

/**
 * The window a collection starts on when nothing else says otherwise: the
 * first page of fifty, from the start of the result, with nothing
 * collapsed. One owner, so the coordinator's seed and a parameter set
 * carrying no window cannot drift apart.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export const DEFAULT_WINDOW: ResultWindow = Object.freeze({
  page: 1,
  size: 50,
  cursor: null,
  collapsed: Object.freeze([]),
});

/**
 * The query that restricts nothing: no filter, no search, no ordering of
 * its own and no grouping. One owner, so the coordinator's seed, a
 * parameter set carrying no query and a caller building one cannot drift
 * apart, and the twin of `DEFAULT_WINDOW` that completes a `Query`.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export const EMPTY_SLICE: Slice = Object.freeze({
  filter: Object.freeze([]),
  search: null,
  sort: Object.freeze([]),
  group: Object.freeze([]),
});
