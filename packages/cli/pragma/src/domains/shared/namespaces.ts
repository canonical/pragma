/**
 * Namespace helpers for SPARQL queries.
 *
 * Derived from {@link PREFIX_MAP} via {@link createNamespace} for use
 * in the `sparql` tagged template.
 */

import { createNamespace } from "@canonical/ke";
import { PREFIX_MAP } from "./prefixes.js";

/** Design system namespace — classes, properties, and instances (e.g., `ds:Component`). */
export const ds = createNamespace(PREFIX_MAP.ds);
/** Component specification namespace — component-level metadata (e.g., `cs:anatomy`). */
export const cs = createNamespace(PREFIX_MAP.cs);
/** RDF Schema namespace — core vocabulary (e.g., `rdfs:label`, `rdfs:subClassOf`). */
export const rdfs = createNamespace(PREFIX_MAP.rdfs);
/** OWL namespace — ontology constructs (e.g., `owl:Class`, `owl:ObjectProperty`). */
export const owl = createNamespace(PREFIX_MAP.owl);
