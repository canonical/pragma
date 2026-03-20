/**
 * Namespace helpers for SPARQL queries.
 *
 * Creates branded URI constructors via {@link createNamespace} for use
 * in the `sparql` tagged template.
 */

import { createNamespace } from "@canonical/ke";

export const ds = createNamespace("https://ds.canonical.com/data/");
export const dso = createNamespace("https://ds.canonical.com/ontology#");
export const cs = createNamespace("http://pragma.canonical.com/codestandards#");
export const rdfs = createNamespace("http://www.w3.org/2000/01/rdf-schema#");
export const owl = createNamespace("http://www.w3.org/2002/07/owl#");
