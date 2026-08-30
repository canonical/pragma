// =============================================================================
// `_meta.title` by hand.
//
// The contract makes `title(lang: String = "en"): String!` NON-NULL, so every
// provider owes a total fallback chain — there is no "no title" answer. This
// file is that chain, written out longhand with no compiler involved. It is
// the honest test the ticket asked for: if computing the fallback by hand were
// awkward, the base would be wrong. It is eight lines.
// =============================================================================

import type { LangMap } from "./types.js";

/**
 * The IRI's local name: everything after the last `#` or `/`. Empty when the
 * IRI ends in a separator — which is why `resolveTitle` has a tier below this.
 */
export const localName = (uri: string): string =>
  uri.slice(Math.max(uri.lastIndexOf("#"), uri.lastIndexOf("/")) + 1);

/**
 * The asserted label for a language: exact tag first, then the untagged
 * literal, then nothing. Asserted-only — `null` is a legitimate answer, and
 * an asserted empty string is a value, not a miss.
 */
export const resolveLabel = (
  labels: LangMap | undefined,
  lang: string,
): string | null => labels?.[lang] ?? labels?.[""] ?? null;

/**
 * The total title chain: asserted label for the language, then any asserted
 * literal in any language, then the IRI's local name, then the whole IRI, then
 * the GraphQL typename. `uri` is null for an embeddable, which has no identity
 * to fall back to — that is the only path that reaches the typename tier.
 */
export const resolveTitle = (
  labels: LangMap | undefined,
  lang: string,
  uri: string | null,
  typename: string,
): string => {
  const labelled = resolveLabel(labels, lang);
  if (labelled !== null && labelled !== "") {
    return labelled;
  }
  const anyLanguage = Object.values(labels ?? {}).find((value) => value !== "");
  if (anyLanguage !== undefined) {
    return anyLanguage;
  }
  if (uri === null) {
    return typename;
  }
  return localName(uri) || uri;
};
