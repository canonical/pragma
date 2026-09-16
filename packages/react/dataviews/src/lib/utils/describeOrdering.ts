import type { DataViewsMessages, SortTerm } from "@canonical/dataviews-core";

/**
 * What an ordering is announced as: the terms the reader states, each by the
 * name `nameOf` gives its field; the source's own order while the reader
 * states none; or that nothing orders the rows.
 *
 * One derivation for every control that changes an ordering — a heading, its
 * menu, the sort panel — so the same outcome is never worded two ways.
 */
export default function describeOrdering(
  applied: readonly SortTerm[],
  defaults: readonly SortTerm[],
  nameOf: (field: string) => string,
  messages: DataViewsMessages,
): string {
  const stated = applied.length > 0;
  const terms = (stated ? applied : defaults).map(({ field, direction }) => ({
    name: nameOf(field),
    direction,
  }));
  if (terms.length === 0) {
    return messages.sortAbsent;
  }
  return stated ? messages.sortApplied(terms) : messages.sortDefaulted(terms);
}
