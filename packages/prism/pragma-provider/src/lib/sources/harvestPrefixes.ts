import { PREFIX_DECL, type TtlSource } from "../config/index.js";

/**
 * Merge every prefix declared in the sources' Turtle prologues.
 *
 * Necessary because ke's `createStore` does not fold parsed-Turtle prefixes
 * into `store.prefixes`, and the compiler needs them to shorten IRIs into the
 * local names that become GraphQL field names. Last declaration wins, which is
 * sound here: pragma's corpus declares each label consistently, and a genuine
 * conflict would surface as a renamed field in the emitted SDL rather than
 * silently.
 */
export const harvestPrefixes = (
  sources: readonly TtlSource[],
): Record<string, string> => {
  const prefixes: Record<string, string> = {};
  for (const source of sources) {
    for (const match of source.content.matchAll(PREFIX_DECL)) {
      const [, label, iri] = match;
      if (label && iri) prefixes[label] = iri;
    }
  }
  return prefixes;
};
