// =============================================================================
// Prefixed URI ↔ full IRI conversion.
//
// The ABSOLUTE IRI is now the identity everywhere internally — EntityValue.uri,
// Node.uri, node(id:), the loader keys, the SPARQL currency, and the connection
// cursors are all the same string. These two helpers survive for the edges:
//
//   toPrefixed — a DISPLAY helper. NO IDENTITY-BEARING PATH MAY CALL IT.
//     That is the whole rule, and it is narrower than the "zero internal
//     callers" this header used to claim. The hazard was never the call, it
//     was the CURRENCY: every former call site sat on a path where the
//     prefixed form could reach a cursor, a loader key, a listing window, or
//     a `node(id:)` argument and drift out of sync with the absolute IRI.
//     Those paths are still forbidden — the pagination path performs no
//     conversion at all.
//     One internal caller exists, and it is the use this header always named
//     as legitimate: `EntityMeta.curie` (lib/tbox/buildTBoxSchema.ts) renders
//     the short form for a consumer. It writes to a String field that nothing
//     reads back, so no identity can be derived from it. A second such
//     resolver would be fine; a second cursor would not.
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
 * Display only — see this file's header. Never use it to derive an identity:
 * not a cursor, not a loader key, not a window entry, not a `node(id:)`
 * argument. `EntityMeta.curie` is the one internal caller.
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
