import canonicalSlice from "../query/canonicalSlice.js";
import type { Slice } from "../query/types.js";
import type {
  SourceCapabilities,
  SourceRefusal,
  SourceSupport,
} from "./types.js";

/**
 * Decide whether a source can execute a query, collecting one structured
 * refusal per unexecutable term. Sort is all-or-nothing: an ordering
 * carrying one unsupported term is refused whole, never truncated.
 */
export default function supportsSlice(
  capabilities: SourceCapabilities,
  slice: Slice,
): SourceSupport {
  // Canonicalizing first deduplicates addresses and fixes the order, so
  // one query always produces the same refusals.
  const query = canonicalSlice(slice);
  const refusals: SourceRefusal[] = [];

  for (const predicate of query.filter) {
    const operators = Object.hasOwn(capabilities.filter, predicate.field)
      ? capabilities.filter[predicate.field]
      : undefined;
    if (operators === undefined || !operators.includes(predicate.operator)) {
      refusals.push({
        part: "filter",
        field: predicate.field,
        operator: predicate.operator,
        reason: `field "${predicate.field}" cannot be filtered with ${predicate.operator}`,
      });
    }
  }

  if (query.search !== null && capabilities.search.length === 0) {
    refusals.push({
      part: "search",
      field: null,
      operator: null,
      reason: "this source cannot search",
    });
  }

  const { sortTerms } = capabilities;
  if (sortTerms !== null && query.sort.length > sortTerms) {
    refusals.push({
      part: "sort",
      field: null,
      operator: null,
      reason:
        sortTerms === 0
          ? "this source cannot sort"
          : `this source executes at most ${sortTerms} sort term${sortTerms === 1 ? "" : "s"}`,
    });
  } else {
    for (const term of query.sort) {
      if (!capabilities.sort.includes(term.field)) {
        refusals.push({
          part: "sort",
          field: term.field,
          operator: null,
          reason: `field "${term.field}" cannot be sorted`,
        });
      }
    }
  }

  if (query.group !== null && !capabilities.group.includes(query.group)) {
    refusals.push({
      part: "group",
      field: query.group,
      operator: null,
      reason: `field "${query.group}" cannot be grouped`,
    });
  }

  return refusals.length === 0
    ? { status: "supported" }
    : { status: "unsupported", refusals: Object.freeze(refusals) };
}
