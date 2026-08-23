// =============================================================================
// The effective namespace → prefix map, and the config lookup that must agree
// with it. ONE authority for both: Pass 1 resolves registered > synthetic
// only, and a validated graphql:prefix declaration binds over that in Pass 2,
// where the projection mode is known (under "auto" the declaration set is
// empty by construction). Every reader of a prefix — node namespaces, the
// prefixed-key mapping table, the injectivity guard, NamespaceInfo, and the
// A005 shadow report — resolves through this one fold.
//
// The two lookups are deliberately inseparable. A005 says "your config key
// shadowed the ontology's annotation"; the site that APPLIES the key decides
// whether that is true. Resolving the key against a different prefix map than
// the one the application uses makes the diagnostic lie in both directions —
// silence where a config key wins, and a shadow report for a key that never
// applied — so the map and the lookup are handed out together.
// =============================================================================

import { getLocalName } from "../shared/index.js";
import getNamespace from "./getNamespace.js";
import type { CustomMapping, CustomMappings } from "./types.js";

/** The effective prefix map plus the readers that must not disagree with it. */
export interface EffectivePrefixes {
  /** Namespace URI → the prefix every consumer sees. */
  namespaces: Map<string, string>;
  /** The prefix of a term URI's namespace; "" when the namespace is unknown. */
  prefixOf: (uri: string) => string;
  /**
   * The custom mapping for a term URI: full-IRI key first, then the
   * `${prefix}:${localName}` spelling under the EFFECTIVE prefix. An unknown
   * namespace has no prefixed spelling to look up, so only the IRI key can
   * match it.
   */
  findMapping: (uri: string) => CustomMapping | undefined;
}

/**
 * Fold validated graphql:prefix declarations over Pass 1's namespace map and
 * return the readers that follow from the result.
 *
 * @param extracted Pass 1's namespace → prefix map (registered or synthetic).
 * @param declared Namespace → prefix from the resolved annotation overlay;
 *   empty under mode "auto", which never consults annotations.
 * @param mappings The consumer's custom mappings, keyed by IRI or prefixed name.
 */
export default function resolveEffectivePrefixes(
  extracted: ReadonlyMap<string, string>,
  declared: ReadonlyMap<string, string>,
  mappings: CustomMappings,
): EffectivePrefixes {
  const namespaces = new Map(extracted);
  for (const [ns, prefix] of declared) {
    namespaces.set(ns, prefix);
  }
  const prefixOf = (uri: string): string =>
    namespaces.get(getNamespace(uri)) ?? "";
  const findMapping = (uri: string): CustomMapping | undefined => {
    const direct = mappings[uri];
    if (direct) {
      return direct;
    }
    const prefix = prefixOf(uri);
    return prefix ? mappings[`${prefix}:${getLocalName(uri)}`] : undefined;
  };
  return { namespaces, prefixOf, findMapping };
}
