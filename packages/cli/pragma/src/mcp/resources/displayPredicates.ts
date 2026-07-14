/**
 * Label and description predicate chains for display-value resolution.
 *
 * Two concerns share this file because they are one policy: how a subject's
 * human name and blurb are found. `resolve*` builds the per-subject priority
 * order (namespace-specific `PROPERTY_MAP` predicate first, then the generic
 * fallback chain); `collect*` builds the flat union used to bulk-query every
 * candidate predicate at once. Keeping them together keeps the fallback
 * ordering and the bulk query in lockstep.
 */

import { PROPERTY_MAP } from "../../constants.js";
import { DESCRIPTION_FALLBACK_URIS, LABEL_FALLBACK_URIS } from "./constants.js";

/** Narrow away `undefined` while preserving the string type. */
function isPresent(value: string | undefined): value is string {
  return value !== undefined;
}

/**
 * Ordered label predicates for a subject: its namespace's `PROPERTY_MAP`
 * label first, then the generic chain so foreign namespaces still resolve.
 *
 * @param prefix - The subject's namespace prefix, or `undefined` if foreign.
 */
export function resolveLabelPredicates(prefix: string | undefined): string[] {
  const specific = prefix ? PROPERTY_MAP[prefix]?.label : undefined;
  return [...new Set([specific, ...LABEL_FALLBACK_URIS].filter(isPresent))];
}

/**
 * Ordered description predicates for a subject: its namespace's `PROPERTY_MAP`
 * description then definition, then the generic chain.
 *
 * @param prefix - The subject's namespace prefix, or `undefined` if foreign.
 */
export function resolveDescriptionPredicates(
  prefix: string | undefined,
): string[] {
  const map = prefix ? PROPERTY_MAP[prefix] : undefined;
  return [
    ...new Set(
      [map?.description, map?.definition, ...DESCRIPTION_FALLBACK_URIS].filter(
        isPresent,
      ),
    ),
  ];
}

/** Every label predicate any namespace might use, for one bulk query. */
export function collectLabelPredicates(): string[] {
  const fromMap = Object.values(PROPERTY_MAP).map((m) => m.label);
  return [...new Set([...fromMap, ...LABEL_FALLBACK_URIS])];
}

/** Every description predicate any namespace might use, for one bulk query. */
export function collectDescriptionPredicates(): string[] {
  const fromMap = Object.values(PROPERTY_MAP).flatMap((m) =>
    [m.description, m.definition].filter(isPresent),
  );
  return [...new Set([...fromMap, ...DESCRIPTION_FALLBACK_URIS])];
}
