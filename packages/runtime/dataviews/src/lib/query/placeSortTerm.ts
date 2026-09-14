import type { SortDirection, SortTerm } from "./types.js";

/**
 * The ordering a column's "sort ascending" or "sort descending" leads to:
 * a path to an ordering that needs no modifier key.
 *
 * A column already ordered takes the direction where it stands. One not yet
 * ordered is appended as the last term while the source has room for
 * another — `terms` is the source's maximum, null for none — and otherwise
 * becomes the ordering alone, so a source that orders by one term still
 * moves to the column chosen.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function placeSortTerm(
  sort: readonly SortTerm[],
  field: string,
  direction: SortDirection,
  terms: number | null,
): readonly SortTerm[] {
  const placed: SortTerm = { field, direction };
  if (sort.some((existing) => existing.field === field)) {
    return sort.map((existing) =>
      existing.field === field ? placed : existing,
    );
  }
  return terms === null || sort.length < terms ? [...sort, placed] : [placed];
}
