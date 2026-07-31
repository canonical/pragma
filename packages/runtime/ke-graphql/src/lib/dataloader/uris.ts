// =============================================================================
// Prefixed URI ↔ full IRI conversion.
//
// The ABSOLUTE IRI is now the identity everywhere internally — EntityValue.uri,
// Node.uri, node(id:), the loader keys, the SPARQL currency, and the connection
// cursors are all the same string. These two helpers survive for the edges:
//
//   toPrefixed — a DISPLAY helper with ZERO internal callers, deliberately.
//     It is public API (a consumer rendering "lib:dune" instead of a 60-char
//     IRI); nothing inside this package may call it, because every internal
//     call site was exactly the place where the prefixed form could drift out
//     of sync with a cursor.
//   toFull — expands the singular `<type>(uri:)` lookup's ARGUMENT, which
//     still accepts the prefixed convenience form. That is its only caller.
// =============================================================================

import type { NamespaceInfo } from "../shared/index.js";

/**
 * Convert a full IRI to its prefixed form ("ds:button") using the compiled
 * namespace inventory. Picks the LONGEST matching namespace so that nested
 * namespaces (e.g. "http://x/" and "http://x/sub/") yield a stable, canonical
 * prefixed form regardless of namespace discovery order. Returns the input
 * unchanged when no registered namespace matches.
 *
 * Display only — see this file's header. Never use it to derive an identity.
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
 * returns undefined when the prefix is unknown — the singular `<type>(uri:)`
 * lookup (this helper's only caller) then falls back to the raw argument,
 * gated by the absolute-IRI admission check. node(id:) never consults this:
 * it is deliberately prefix-map-free.
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
