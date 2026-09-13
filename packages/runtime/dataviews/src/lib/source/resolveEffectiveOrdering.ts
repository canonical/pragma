import type { Slice, SortTerm } from "../query/index.js";
import { collapseSortTerms } from "../query/index.js";
import type { EffectiveOrdering, SortCapabilities } from "./types.js";

/**
 * Resolve what actually orders a query's rows, from the query and what the
 * source declares about ordering.
 *
 * An empty ordering means "the source's default", never "unordered": a
 * source documents the order its pages come in, and a query stating no term
 * of its own runs on it. One shared answer, so a local execution, a header
 * and a server render describe the same rows the same way.
 *
 * Seam for the header unit, which reads this to show the ordering in force
 * when the query states none, and exports it with that consumer.
 */
export default function resolveEffectiveOrdering(
  slice: Slice,
  declared: SortCapabilities,
): EffectiveOrdering {
  const stated = collapseSortTerms(
    slice.sort.length > 0 ? slice.sort : declared.default,
  );
  const directions = new Map(
    stated.map((term) => [term.field, term.direction]),
  );
  const levels = slice.group.map(
    (level): SortTerm => ({
      field: level.field,
      direction: directions.get(level.field) ?? "asc",
    }),
  );
  return {
    // Levels first, so collapsing drops the term the level already carries.
    terms: collapseSortTerms([...levels, ...stated]),
    tiebreak: declared.tiebreak,
  };
}
