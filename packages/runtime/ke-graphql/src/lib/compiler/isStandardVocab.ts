import { STANDARD_NAMESPACES } from "../shared/index.js";

/**
 * Check whether a URI belongs to a standard vocabulary namespace
 * (rdf/rdfs/owl/xsd/skos/sh) — such URIs never produce GraphQL types.
 */
export default function isStandardVocab(uri: string): boolean {
  return STANDARD_NAMESPACES.some((ns) => uri.startsWith(ns));
}
