/**
 * Prefix map for ke store creation.
 *
 * Registered as PREFIX declarations in every SPARQL query.
 */

import type { PrefixMap } from "@canonical/ke";

export const PREFIX_MAP: PrefixMap = {
  ds: "https://ds.canonical.com/",
  cso: "http://pragma.canonical.com/codestandards#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  owl: "http://www.w3.org/2002/07/owl#",
};
