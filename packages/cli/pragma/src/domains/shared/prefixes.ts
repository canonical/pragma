/**
 * Prefix map for ke store creation.
 *
 * Registered as PREFIX declarations in every SPARQL query.
 * Single source of truth — rename a key here and P updates automatically.
 */

import type { PrefixMap } from "@canonical/ke";

export const PREFIX_MAP = {
  ds: "https://ds.canonical.com/data/",
  dso: "https://ds.canonical.com/ontology#",
  cs: "http://pragma.canonical.com/codestandards#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  owl: "http://www.w3.org/2002/07/owl#",
} as const satisfies PrefixMap;

/**
 * SPARQL prefix accessors derived from {@link PREFIX_MAP}.
 *
 * Use in query templates: `${P.dso}Component` → `"dso:Component"`.
 * Renaming a key in PREFIX_MAP automatically updates every query.
 */
export const P = Object.fromEntries(
  Object.keys(PREFIX_MAP).map((k) => [k, `${k}:`]),
) as { readonly [K in keyof typeof PREFIX_MAP]: `${K}:` };
