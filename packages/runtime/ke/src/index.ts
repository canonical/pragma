/**
 * @canonical/ke — Headless triple store runtime
 *
 * @example
 * ```ts
 * import { createStore, sparql } from "@canonical/ke";
 *
 * const store = await createStore({
 *   sources: ["./ontology.ttl"],
 *   prefixes: { schema: "http://schema.org/" },
 * });
 *
 * const result = await store.query(sparql`SELECT ?name WHERE { ?s schema:name ?name }`);
 * ```
 */

export { default as createNamespace } from "./lib/createNamespace.js";
export { default as createStore } from "./lib/createStore.js";
export { default as definePlugin } from "./lib/definePlugin.js";
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
