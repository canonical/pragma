export { default as createNamespace } from "./createNamespace.js";
export { default as createStore } from "./createStore.js";
export { default as definePlugin } from "./definePlugin.js";
export {
  escapeSparqlURI,
  escapeSparqlValue,
  markAsURI,
  sparql,
} from "./sparql.js";
export type {
  AskResult,
  Binding,
  ConstructResult,
  GraphName,
  InferQueryResult,
  Plugin,
  PluginContext,
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
export { default as validateIri } from "./validateIri.js";
