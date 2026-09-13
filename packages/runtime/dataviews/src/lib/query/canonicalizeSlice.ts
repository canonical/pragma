import addressPredicate from "./addressPredicate.js";
import collapseSortTerms from "./collapseSortTerms.js";
import rankOperand from "./rankOperand.js";
import type { GroupTerm, Predicate, PredicateOperand, Slice } from "./types.js";

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
    const left = rankOperand(a);
    const right = rankOperand(b);
    return left < right ? -1 : left > right ? 1 : 0;
  });
  const operands: PredicateOperand[] = [];
  for (const operand of sorted) {
    const last = operands.at(-1);
    if (last === undefined || rankOperand(last) !== rankOperand(operand)) {
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
  addressPredicate(a.field, a.operator) > addressPredicate(b.field, b.operator)
    ? 1
    : -1;

/**
 * Normalize a slice to its canonical form: equality operands are sets,
 * predicates are ordered by address, sort and group terms keep their order
 * with a repeated sort field collapsed to its first occurrence, and an empty
 * search is no search. Idempotent:
 * `canonicalizeSlice(canonicalizeSlice(x))` equals `canonicalizeSlice(x)`.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function canonicalizeSlice(slice: Slice): Slice {
  const byAddress = new Map<string, Predicate>();
  for (const predicate of slice.filter) {
    byAddress.set(
      addressPredicate(predicate.field, predicate.operator),
      predicate,
    );
  }
  return {
    filter: [...byAddress.values()]
      .map(canonicalPredicate)
      .sort(compareByAddress),
    search: slice.search === "" ? null : slice.search,
    sort: collapseSortTerms(slice.sort),
    group: slice.group.map((term): GroupTerm => ({ field: term.field })),
  };
}
