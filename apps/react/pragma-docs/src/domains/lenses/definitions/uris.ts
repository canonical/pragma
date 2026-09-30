/**
 * The prefixed↔full URI codec for ontology terms.
 *
 * The ontology GraphQL surface returns FULL IRIs from every `uri` field on
 * `Ontology.classes` / `Ontology.properties` and on class/property lookups
 * (verified live: `ds:UIBlock` resolves but comes back as
 * `https://ds.canonical.com/UIBlock`), while the docsite's term addresses —
 * the `/definitions/:term` param and term-chip hrefs — use the compact
 * prefixed form (`ds:UIBlock`). This codec converts between the two using
 * the ontologies' own (prefix, namespace) pairs, which ride the explorer
 * query — never a hardcoded namespace table, so a new ontology needs no
 * code change here.
 *
 * Both directions are total: a URI that matches no known namespace/prefix
 * passes through unchanged, because a term address must never make the
 * page throw — the inspector's not-found branch owns unknown terms.
 */

/** One ontology's addressing identity, as the graph states it. */
export interface OntologyNamespace {
  /** The compact prefix, e.g. `ds`. */
  readonly prefix: string;
  /** The full namespace IRI, e.g. `https://ds.canonical.com/`. */
  readonly namespace: string;
}

/**
 * Full IRI → prefixed form (`https://ds.canonical.com/UIBlock` →
 * `ds:UIBlock`). Longest-namespace match wins so one namespace being a
 * prefix of another can never mis-split; unmatched URIs pass through.
 */
export const toPrefixedUri = (
  uri: string,
  namespaces: readonly OntologyNamespace[],
): string => {
  let best: OntologyNamespace | undefined;
  for (const candidate of namespaces) {
    if (
      uri.startsWith(candidate.namespace) &&
      uri.length > candidate.namespace.length &&
      (best === undefined || candidate.namespace.length > best.namespace.length)
    ) {
      best = candidate;
    }
  }
  if (best === undefined) return uri;
  return `${best.prefix}:${uri.slice(best.namespace.length)}`;
};

/**
 * Prefixed form → full IRI (`ds:UIBlock` →
 * `https://ds.canonical.com/UIBlock`). URIs whose prefix is unknown — or
 * that carry no colon at all — pass through.
 */
export const toFullUri = (
  uri: string,
  namespaces: readonly OntologyNamespace[],
): string => {
  const colonIndex = uri.indexOf(":");
  if (colonIndex === -1) return uri;
  const prefix = uri.slice(0, colonIndex);
  const match = namespaces.find((candidate) => candidate.prefix === prefix);
  if (match === undefined) return uri;
  return `${match.namespace}${uri.slice(colonIndex + 1)}`;
};
