// =============================================================================
// IRI-injection guard. Loaders interpolate full IRIs into SPARQL as `<${iri}>`
// (e.g. VALUES ?s { <...> }). The IRI ultimately derives from client input
// (node(id:) / <type>(uri:) arguments), so an IRI carrying an IRIREF-illegal
// character -- `>` above all -- would terminate the IRIREF early and inject
// the remainder as SPARQL graph patterns. ke queries are read-only, so the
// blast radius is cross-graph disclosure and query-cost amplification rather
// than mutation, but it is still reachable unauthenticated.
//
// Per the SPARQL grammar an IRIREF is '<' ([^<>"{}|^`\]-[#x00-#x20])* '>'.
// A well-formed IRI never contains any of those characters, so rejecting them
// closes the injection without affecting any legitimate identifier. Legal IRI
// punctuation (#, /, :, ?, %, ...) is deliberately NOT rejected.
// =============================================================================

// Code points forbidden inside a SPARQL IRIREF: <, >, ", {, }, |, ^, backtick,
// backslash (control characters and space are handled by the <= 0x20 test).
const FORBIDDEN = new Set([
  0x3c, 0x3e, 0x22, 0x7b, 0x7d, 0x7c, 0x5e, 0x60, 0x5c,
]);

/**
 * Report whether an IRI is safe to interpolate into a SPARQL `<...>` IRIREF --
 * i.e. it is non-empty and contains no IRIREF-illegal character. Callers
 * filter unsafe IRIs out of the query (an unsafe global ID then resolves to
 * "not found", never to injected SPARQL).
 */
export default function isSafeIri(iri: string): boolean {
  if (iri.length === 0) {
    return false;
  }
  for (let i = 0; i < iri.length; i++) {
    const code = iri.charCodeAt(i);
    if (code <= 0x20 || FORBIDDEN.has(code)) {
      return false;
    }
  }
  return true;
}
