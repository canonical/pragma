/**
 * The compiled-in prefix map — the CLI's prefixed↔full translation table.
 *
 * NOT only display compaction, despite the name this module used to carry.
 * Three readers make it behavioural, and every one of them predates any store:
 * - `render/compactUri.ts` shortens IRIs for output.
 * - `packs/iri.ts#resolveUri` expands a user-typed prefixed name into the IRI a
 *   generated SPARQL read filters on, so a namespace missing here makes
 *   `<noun> lookup <prefix>:<local>` fail with "Invalid prefix".
 * - `packs/graphql/fetchGraphqlLookup.ts#expandPrefixed` expands the prefixed
 *   values a GraphQL lookup returns, so a namespace missing here silently
 *   leaks the *unexpanded* token into a field documented as a full IRI.
 *
 * Two halves, one map. The W3C namespaces below are universal vocabulary, so
 * the kernel names them. The DOMAIN namespaces are the distribution's, so they
 * are read from `pragma.conf.ts`'s `prefixes` — the same declaration that pins
 * what `sources update` builds the store with, so what the CLI compacts and
 * what the graph is indexed under cannot drift apart. `render/prefixes.test.ts`
 * pins that agreement against the shipped pack's own manifest.
 *
 * The asymmetry, stated plainly: a PROJECT layer's `prefixes` reach the pack it
 * builds — hence that pack's store session and index — but never this map. This
 * is a compiled-in presentation default, read on the storeless `--help`/
 * `__complete` fast path where no config layer is reachable at all.
 */

import conf from "../../../pragma.conf.js";

/** Standard RDF vocabulary — the same IRIs in every graph, domain or not. */
const STANDARD_PREFIXES: Readonly<Record<string, string>> = {
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  owl: "http://www.w3.org/2002/07/owl#",
  skos: "http://www.w3.org/2004/02/skos/core#",
};

/**
 * Namespaces compacted and expanded across the CLI. Keys are the prefixes shown
 * to the user (`rdfs:label`); values are the absolute namespace IRIs matched.
 */
export const DEFAULT_PREFIX_MAP: Readonly<Record<string, string>> = {
  ...STANDARD_PREFIXES,
  ...conf.prefixes,
};
