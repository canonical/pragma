/**
 * The default display-compaction prefix set.
 *
 * A minimal port of the v1 prefix map: only the namespaces the renderers use
 * to compact IRIs in output. The store's query prefix map (which layers in
 * package- and config-declared prefixes) is a store concern and joins when the
 * first store-backed capability lands — this display set is intentionally
 * small and static so the render layer stays store-free.
 */

/**
 * Namespaces compacted in list/lookup output. Keys are the prefixes shown to
 * the user (`ds:Button`); values are the absolute namespace IRIs matched.
 */
export const DEFAULT_PREFIX_MAP: Readonly<Record<string, string>> = {
  ds: "https://ds.canonical.com/",
  cs: "http://pragma.canonical.com/codestandards#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  owl: "http://www.w3.org/2002/07/owl#",
  skos: "http://www.w3.org/2004/02/skos/core#",
};
