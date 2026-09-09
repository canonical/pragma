import type {
  Predicate,
  PredicateOperand,
  PredicateOperator,
  Slice,
} from "./types.js";

/** Stable address of a predicate: its field and operator pair. */
export const predicateAddress = (
  field: string,
  operator: PredicateOperator,
): string => `${field}\u0000${operator}`;

/**
 * Total order over operand values: type tag first, then value within type.
 * Plain code-point comparison, not locale collation, so canonical order is
 * environment-stable and never ties on distinct strings.
 */
export const operandRankOf = (operand: PredicateOperand): string =>
  `${typeof operand}:${String(operand)}`;

/** Canonicalize one predicate: equality operands become an ordered set. */
const canonicalPredicate = (predicate: Predicate): Predicate => {
  if (predicate.operator !== "eq") {
    return {
      field: predicate.field,
      operator: predicate.operator,
      operands: [...predicate.operands],
    };
  }
  const sorted = [...predicate.operands].sort((a, b) => {
    const left = operandRankOf(a);
    const right = operandRankOf(b);
    return left < right ? -1 : left > right ? 1 : 0;
  });
  const operands: PredicateOperand[] = [];
  for (const operand of sorted) {
    const last = operands.at(-1);
    if (last === undefined || operandRankOf(last) !== operandRankOf(operand)) {
      operands.push(operand);
    }
  }
  // Rebuild in a fixed key order so fingerprints are invariant under
  // key-order respelling of the input.
  return { field: predicate.field, operator: predicate.operator, operands };
};

/**
 * Order predicates by address. Addresses are unique after collapse, so this
 * strict comparison is a total order and never returns 0.
 */
const compareByAddress = (a: Predicate, b: Predicate): number =>
  predicateAddress(a.field, a.operator) > predicateAddress(b.field, b.operator)
    ? 1
    : -1;

/**
 * Normalize a slice to its canonical form: equality operands are sets,
 * predicates are ordered by address, sort terms keep their order, and an
 * empty search is no search. Idempotent: `canonicalSlice(canonicalSlice(x))`
 * equals `canonicalSlice(x)`.
 */
export default function canonicalSlice(slice: Slice): Slice {
  const byAddress = new Map<string, Predicate>();
  for (const predicate of slice.filter) {
    byAddress.set(
      predicateAddress(predicate.field, predicate.operator),
      predicate,
    );
  }
  return {
    filter: [...byAddress.values()]
      .map(canonicalPredicate)
      .sort(compareByAddress),
    search: slice.search === "" ? null : slice.search,
    sort: slice.sort.map((term) => ({
      field: term.field,
      direction: term.direction,
    })),
    group: slice.group,
  };
}
