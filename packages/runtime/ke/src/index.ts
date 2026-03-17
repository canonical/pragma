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

export { create } from "./lib/create.js";
export { definePlugin } from "./lib/definePlugin.js";
export { namespace } from "./lib/namespace.js";
export {
  escapeSparqlURI,
  escapeSparqlValue,
  markAsURI,
  sparql,
} from "./lib/sparql.js";

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
} from "./lib/types.js";
