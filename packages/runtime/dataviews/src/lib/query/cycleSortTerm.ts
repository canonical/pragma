import type { SortTerm } from "./types.js";

/**
 * The ordering one activation of a sortable column leads to, from the
 * ordering the query states.
 *
 * A plain activation sorts by the column alone and cycles it: ascending
 * first, then descending, then no term of its own, which runs the source's
 * default — enabling a sort never lands on descending by accident. An
 * additive activation keeps every other term: a column not yet ordered is
 * appended ascending, an ascending one turns descending where it stands, and
 * a descending one leaves the ordering, promoting the terms after it.
 *
 * Arity is not decided here: the source refuses an ordering longer than it
 * executes, and the refusal says why.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function cycleSortTerm(
  sort: readonly SortTerm[],
  field: string,
  additive: boolean,
): readonly SortTerm[] {
  const current = sort.find((term) => term.field === field);
  if (!additive) {
    if (current === undefined) {
      return [{ field, direction: "asc" }];
    }
    return current.direction === "asc" ? [{ field, direction: "desc" }] : [];
  }
  if (current === undefined) {
    return [...sort, { field, direction: "asc" }];
  }
  return current.direction === "asc"
    ? sort.map((term) =>
        term.field === field ? { field, direction: "desc" } : term,
      )
    : sort.filter((term) => term.field !== field);
}
