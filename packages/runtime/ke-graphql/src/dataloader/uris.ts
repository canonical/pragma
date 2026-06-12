// =============================================================================
// Prefixed URI ↔ full IRI conversion (KG.10). The prefixed form is the
// public identity (global IDs, EntityValue.uri); full IRIs are the loader
// keys and SPARQL currency.
// =============================================================================

import type { NamespaceInfo } from "../compiler/types.js";

export const toPrefixed = (
  fullUri: string,
  namespaces: ReadonlyMap<string, NamespaceInfo>,
): string => {
  for (const ns of namespaces.values()) {
    if (fullUri.startsWith(ns.uri)) {
      return `${ns.prefix}:${fullUri.slice(ns.uri.length)}`;
    }
  }
  return fullUri;
};

/** Returns undefined when the prefix is unknown (node() returns null then). */
export const toFull = (
  prefixed: string,
  namespaces: ReadonlyMap<string, NamespaceInfo>,
): string | undefined => {
  const colon = prefixed.indexOf(":");
  if (colon === -1) {
    return undefined;
  }
  const prefix = prefixed.slice(0, colon);
  const rest = prefixed.slice(colon + 1);
  const ns = namespaces.get(prefix);
  if (ns) {
    return `${ns.uri}${rest}`;
  }
  // Already a full IRI (contains "://" or another colon-bearing scheme).
  if (rest.startsWith("//")) {
    return prefixed;
  }
  return undefined;
};
