/**
 * @canonical/ke — Headless triple store runtime
 *
 * @example
 * ```ts
 * import { create, sparql } from "@canonical/ke";
 *
 * const store = await create({
 *   sources: ["./ontology.ttl"],
 *   prefixes: { schema: "http://schema.org/" },
 * });
 *
 * const result = await store.query(sparql`SELECT ?name WHERE { ?s schema:name ?name }`);
 * ```
 */

// Namespace helper
export { namespace } from "./namespace.js";
// Plugin helper
export { definePlugin } from "./plugin.js";
// Tagged template & escaping
export {
  escapeSparqlURI,
  escapeSparqlValue,
  markAsURI,
  sparql,
} from "./sparql.js";
// Core entry point
export { create } from "./store.js";

// Types
export type {
  AskResult,
  Binding,
  ConstructResult,
  GraphName,
  InferQueryResult,
  Plugin,
  PrefixMap,
  QueryResult,
  ReloadOptions,
  ResolvedSource,
  SelectResult,
  SourceConfig,
  SourceSpec,
  SPARQL,
  Store,
  StoreConfig,
  Triple,
  URI,
} from "./types.js";
