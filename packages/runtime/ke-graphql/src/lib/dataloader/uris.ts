// =============================================================================
// Prefixed URI ↔ full IRI conversion (KG.10). The prefixed form is the
// public identity (global IDs, EntityValue.uri); full IRIs are the loader
// keys and SPARQL currency.
// =============================================================================

import type { NamespaceInfo } from "#shared";

/**
 * Convert a full IRI to its prefixed form ("ds:button") using the compiled
 * namespace inventory. Picks the LONGEST matching namespace so that nested
 * namespaces (e.g. "http://x/" and "http://x/sub/") yield a stable, canonical
 * prefixed form regardless of namespace discovery order — Relay global IDs and
 * cursors depend on this being deterministic (KG.10). Returns the input
 * unchanged when no registered namespace matches.
 */
export const toPrefixed = (
  fullUri: string,
  namespaces: ReadonlyMap<string, NamespaceInfo>,
): string => {
  let best: string | undefined;
  let bestLength = -1;
  for (const ns of namespaces.values()) {
    if (fullUri.startsWith(ns.uri) && ns.uri.length > bestLength) {
      bestLength = ns.uri.length;
      best = `${ns.prefix}:${fullUri.slice(ns.uri.length)}`;
    }
  }
  return best ?? fullUri;
};

/**
 * Convert a prefixed URI ("ds:button") to its full IRI using the compiled
 * namespace inventory. Inputs that are already full IRIs pass through;
 * returns undefined when the prefix is unknown (node() returns null then).
 */
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
