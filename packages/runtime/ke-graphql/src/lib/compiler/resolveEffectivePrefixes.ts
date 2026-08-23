// =============================================================================
// The effective namespace → prefix map. ONE authority for every reader of a
// prefix — node namespaces, field-name prefixing, the injectivity guard and
// NamespaceInfo: Pass 1 resolves registered > synthetic only, and a
// validated graphql:prefix declaration binds over that in Pass 2, where the
// projection mode is known (under "auto" the declaration set is empty by
// construction).
// =============================================================================

import getNamespace from "./getNamespace.js";

/** The effective prefix map plus the reader that must not disagree with it. */
export interface EffectivePrefixes {
  /** Namespace URI → the prefix every consumer sees. */
  namespaces: Map<string, string>;
  /** The prefix of a term URI's namespace; "" when the namespace is unknown. */
  prefixOf: (uri: string) => string;
}

/**
 * Fold validated graphql:prefix declarations over Pass 1's namespace map and
 * return the reader that follows from the result.
 *
 * @param extracted Pass 1's namespace → prefix map (registered or synthetic).
 * @param declared Namespace → prefix from the resolved annotation overlay;
 *   empty under mode "auto", which never consults annotations.
 */
export default function resolveEffectivePrefixes(
  extracted: ReadonlyMap<string, string>,
  declared: ReadonlyMap<string, string>,
): EffectivePrefixes {
  const namespaces = new Map(extracted);
  for (const [ns, prefix] of declared) {
    namespaces.set(ns, prefix);
  }
  const prefixOf = (uri: string): string =>
    namespaces.get(getNamespace(uri)) ?? "";
  return { namespaces, prefixOf };
}
