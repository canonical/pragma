/**
 * Namespace helpers for SPARQL queries.
 *
 * Derived from {@link PREFIX_MAP} via {@link createNamespace} for use
 * in the `sparql` tagged template.
 */

import { createNamespace } from "@canonical/ke";
import { PREFIX_MAP } from "./prefixes.js";

export const ds = createNamespace(PREFIX_MAP.ds);
export const cs = createNamespace(PREFIX_MAP.cs);
export const rdfs = createNamespace(PREFIX_MAP.rdfs);
export const owl = createNamespace(PREFIX_MAP.owl);
