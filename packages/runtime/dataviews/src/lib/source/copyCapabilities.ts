import type { PredicateOperator } from "../query/types.js";
import type { SourceCapabilities } from "./types.js";

/**
 * A frozen, prototype-free copy of a source's declaration, so it cannot
 * change under the binding after construction and a field named for an
 * `Object.prototype` member reads as absent rather than as a function.
 */
export default function copyCapabilities(
  capabilities: SourceCapabilities,
): SourceCapabilities {
  const filter: Record<string, readonly PredicateOperator[]> =
    Object.create(null);
  for (const [field, operators] of Object.entries(capabilities.filter)) {
    filter[field] = Object.freeze([...(operators ?? [])]);
  }
  return Object.freeze({
    filter: Object.freeze(filter),
    search: Object.freeze([...capabilities.search]),
    sort: Object.freeze([...capabilities.sort]),
    sortTerms: capabilities.sortTerms,
    group: Object.freeze([...capabilities.group]),
    count: capabilities.count,
  });
}
