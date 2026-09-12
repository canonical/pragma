/**
 * The flat, form-compatible wire grammar: how a query is spelled as URL
 * parameters. Repeated values carry equality operand sets, ordered sort
 * terms and nested grouping levels; a `field__operator` key carries a
 * bound; the window is `page`, `size` and `cursor`. Everything else in a
 * URL belongs to the host.
 */

import type { PredicateOperator } from "../query/types.js";

/** The delimiter between a field's wire name and its operator. */
export const OPERATOR_DELIMITER = "__";

/**
 * The parameters the grammar writes for every collection. Collapse is
 * window-class but has no spelling: a reload expands every group.
 */
const WRITTEN_QUERY_KEYS: readonly string[] = Object.freeze([
  "q",
  "sort",
  "group",
  "page",
  "size",
  "cursor",
]);

/**
 * Parameter names the grammar reserves: those it writes, plus the
 * annotation names it leaves to the host. A field's wire name may not
 * collide with one — the query would be ambiguous.
 */
export const RESERVED_QUERY_KEYS: readonly string[] = Object.freeze([
  ...WRITTEN_QUERY_KEYS,
  "as",
  "view",
  "item",
]);

/** The operators written with the delimiter. `eq` is the bare field name. */
export const SUFFIXED_OPERATORS = Object.freeze([
  "gte",
  "lte",
  "isSet",
] as const satisfies readonly PredicateOperator[]);

/** The wire key one predicate address is written as. */
export const wireKeyOf = (
  field: string,
  operator: PredicateOperator,
): string =>
  operator === "eq" ? field : `${field}${OPERATOR_DELIMITER}${operator}`;

/** The field a wire key addresses: the part before the delimiter. */
export const fieldOfWireKey = (key: string): string => {
  const at = key.indexOf(OPERATOR_DELIMITER);
  return at === -1 ? key : key.slice(0, at);
};

/** Why a field name cannot be spelled on the wire, or null when it can. */
export const wireNameRejection = (field: string): string | null => {
  if (field.includes(OPERATOR_DELIMITER)) {
    return `field name "${field}" must not contain "${OPERATOR_DELIMITER}"`;
  }
  if (RESERVED_QUERY_KEYS.includes(field)) {
    return `field name "${field}" is a reserved query parameter`;
  }
  return null;
};

/**
 * Whether one parameter belongs to a collection's query: a written name, a
 * field, or any `field__…` address of one — a refused operator included, so
 * the encoder clears what the decoder reported. A delimited name whose
 * prefix is no field is the host's.
 */
export const isOwnedKey = (
  key: string,
  hasField: (name: string) => boolean,
): boolean => WRITTEN_QUERY_KEYS.includes(key) || hasField(fieldOfWireKey(key));
