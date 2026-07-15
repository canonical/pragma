/**
 * Namespace helpers for SPARQL queries.
 *
 * Derived from {@link PREFIX_MAP} via {@link createNamespace} for use
 * in the `sparql` tagged template.
 */

import { createNamespace } from "@canonical/ke";
import { PREFIX_MAP, TRANSITIONAL_DS_PREFIX_MAP } from "./prefixes.js";

/**
 * Design system namespace — classes, properties, and instances (e.g., `ds:Component`).
 * @remarks transitional — sourced from the bundled DS fallback until the
 * design-system package declares its own prefixes (remove in P4).
 */
export const ds = createNamespace(TRANSITIONAL_DS_PREFIX_MAP.ds);
/**
 * Component specification namespace — component-level metadata (e.g., `cs:anatomy`).
 * @remarks transitional — sourced from the bundled DS fallback until the
 * code-standards package declares its own prefixes (remove in P4).
 */
export const cs = createNamespace(TRANSITIONAL_DS_PREFIX_MAP.cs);
/** RDF Schema namespace — core vocabulary (e.g., `rdfs:label`, `rdfs:subClassOf`). */
export const rdfs = createNamespace(PREFIX_MAP.rdfs);
/** OWL namespace — ontology constructs (e.g., `owl:Class`, `owl:ObjectProperty`). */
export const owl = createNamespace(PREFIX_MAP.owl);
