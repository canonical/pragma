// =============================================================================
// @canonical/ke — Core type definitions
//
// This file defines the public API surface of the ke triple store runtime.
// Every type here is part of the package contract. Changes require semver
// consideration.
// =============================================================================

// ---------------------------------------------------------------------------
// Branded types
//
// Branded types add compile-time safety to string values that have semantic
// meaning. A URI is a string at runtime, but TypeScript won't let you pass
// a plain string where a URI is expected. This catches bugs like passing a
// component name where a URI is needed.
//
// The brands exist only in the type system — they have zero runtime cost.
// To create a branded value, use the helpers: `createNamespace()` for URIs,
// `sparql` tagged template for SPARQL strings.
// ---------------------------------------------------------------------------

/** A string that represents an RDF URI (IRI). Created via `createNamespace()` or `markAsURI()`. */
declare const URIBrand: unique symbol;
export type URI = string & { [URIBrand]: true };

/**
 * A string that represents a SPARQL query. Created via the `sparql` tagged template.
 *
 * The type parameter `Q` captures the literal string type of the query,
 * enabling `InferQueryResult<Q>` to narrow the return type at compile time.
 * For example, `sparql\`SELECT ...\`` produces `SPARQL<"SELECT ...">`, which
 * makes `store.query()` return `SelectResult` instead of the full union.
 */
declare const SPARQLBrand: unique symbol;
export type SPARQL<Q extends string = string> = Q & { [SPARQLBrand]: true };

/** A string that represents an RDF named graph identifier. */
declare const GraphNameBrand: unique symbol;
export type GraphName = string & { [GraphNameBrand]: true };

// ---------------------------------------------------------------------------
// Prefix map
//
// A PrefixMap maps short prefix names to full namespace IRIs. When registered
// at store creation, these prefixes are automatically prepended as PREFIX
// declarations to every SPARQL query the store executes.
//
// This means you can write:
//   store.query(sparql`SELECT ?name WHERE { ?c a ds:UIBlock ; ds:name ?name }`)
//
// Instead of:
//   store.query(sparql`SELECT ?name WHERE { ?c a <https://ds.canonical.com/UIBlock> ; <https://ds.canonical.com/name> ?name }`)
//
// How it works internally:
// 1. Consumer passes `prefixes: { ds: "https://ds.canonical.com/" }` to `createStore()`
// 2. The store saves a shallow copy of this map
// 3. On every `store.query()` call, `expandPrefixes()` prepends
//    `PREFIX ds: <https://ds.canonical.com/>` before the query string
// 4. Oxigraph's SPARQL parser resolves `ds:UIBlock` → `<https://ds.canonical.com/UIBlock>`
//
// The prefix map is exposed as `store.prefixes` (readonly) so consumers can
// inspect which prefixes are registered, e.g. for building SPARQL dynamically.
//
// Note: Prefixes are NOT the same as TTL @prefix declarations in source files.
// TTL @prefix only applies within that file during parsing. The PrefixMap applies
// to queries at execution time.
// ---------------------------------------------------------------------------

/** Maps short prefix names to full namespace IRIs for SPARQL query expansion. */
export type PrefixMap = Record<string, string>;

// ---------------------------------------------------------------------------
// Source specification
//
// Sources tell ke where to find RDF data to load into the store. A source
// can be a simple file path string or a SourceConfig object with more control.
//
// Simple form (just a path or glob):
//   sources: ["./ontology.ttl", "./data/**/*.ttl"]
//
// Config form (control graph assignment and format):
//   sources: [{ patterns: ["./data/*.ttl"], graph: "urn:pragma:data", format: "turtle" }]
//
// Glob patterns are resolved at store creation time using Node's globSync.
// Each resolved file is read into memory and parsed by Oxigraph.
// ---------------------------------------------------------------------------

/**
 * Detailed source configuration. Use when you need to assign sources to a
 * specific named graph or override the format auto-detection.
 */
export interface SourceConfig {
  /** File paths or glob patterns to resolve. Relative paths are resolved from cwd. */
  patterns: string[];

  /**
   * Named graph URI to load these triples into. If omitted, triples go into
   * the default graph. Named graphs enable provenance queries — you can ask
   * "which graph did this triple come from?" using GRAPH clauses.
   */
  graph?: string;

  /**
   * RDF serialization format. Auto-detected from file extension if omitted.
   * .ttl → turtle, .nt → ntriples, .rdf → rdfxml
   */
  format?: "turtle" | "ntriples" | "rdfxml";
}

/**
 * A source can be a simple file path/glob string, or a detailed SourceConfig.
 * Simple strings are normalized to `{ patterns: [theString] }` internally.
 */
export type SourceSpec = string | SourceConfig;

// ---------------------------------------------------------------------------
// Store configuration
// ---------------------------------------------------------------------------

/** Configuration object passed to `createStore()`. */
export interface StoreConfig {
  /** RDF data sources to load. File paths, globs, or SourceConfig objects. */
  sources: SourceSpec[];

  /**
   * Plugin chain. Plugins are called in array order for each lifecycle event.
   * See the Plugin interface for hook details.
   */
  plugins?: Plugin[];

  /**
   * Namespace prefix map. These prefixes are prepended as PREFIX declarations
   * to every SPARQL query. See PrefixMap documentation above for details.
   */
  prefixes?: PrefixMap;

  /**
   * File path for serialized store cache (N-Quads format).
   * If provided, the store will:
   * 1. On first boot: load sources normally, then serialize to this path
   * 2. On subsequent boots: load from cache (skipping source resolution)
   * This dramatically speeds up boot time for large datasets.
   * Use `store.reload({ force: true })` to bypass the cache.
   */
  cache?: string;

  /**
   * Base directory for resolving relative source paths and glob patterns.
   * Defaults to `process.cwd()` if omitted.
   */
  cwd?: string;
}

// ---------------------------------------------------------------------------
// Resolved source (internal, but exposed for plugins)
// ---------------------------------------------------------------------------

/**
 * A source after glob resolution and file reading. This is what plugins
 * receive in their `onLoad` hook — the file has been read but not yet
 * parsed by Oxigraph. A plugin could modify `content` to transform TTL
 * before loading, or log `path` for diagnostics.
 */
export interface ResolvedSource {
  /** Absolute path of the resolved file. */
  path: string;

  /** Named graph this source will be loaded into, if specified. */
  graph?: string;

  /** Detected or specified RDF format. */
  format: "turtle" | "ntriples" | "rdfxml";

  /** The raw file content (TTL, N-Triples, or RDF/XML as a string). */
  content: string;
}

// ---------------------------------------------------------------------------
// Reload options
// ---------------------------------------------------------------------------

export interface ReloadOptions {
  /**
   * When true, bypasses the cache and re-reads all sources from disk.
   * When false (default), uses the cache if available.
   */
  force?: boolean;
}

// ---------------------------------------------------------------------------
// Query result types
//
// SPARQL has three query forms, each returning a different shape:
//
// SELECT — returns variable bindings (rows of key-value pairs)
//   "Which components are in the global tier?"
//   → { type: "select", variables: ["name"], bindings: [{ name: "Button" }, ...] }
//
// CONSTRUCT — returns triples (an RDF subgraph)
//   "Give me all triples about Button"
//   → { type: "construct", triples: [{ subject: "...", predicate: "...", object: "..." }, ...] }
//
// ASK — returns a boolean
//   "Does Button exist in the ontology?"
//   → { type: "ask", result: true }
//
// The `type` field is a discriminant — you can narrow with `if (result.type === "select")`.
// ---------------------------------------------------------------------------

/** A single RDF triple (subject-predicate-object). */
export interface Triple {
  subject: string;
  predicate: string;
  object: string;
}

/**
 * A single binding row from a SELECT query. Keys are variable names
 * (without the `?` prefix), values are the string representation of
 * the bound RDF term.
 */
export type Binding = Record<string, string>;

/** Result of a SELECT query: variable names and binding rows. */
export interface SelectResult {
  type: "select";
  variables: string[];
  bindings: Binding[];
}

/** Result of a CONSTRUCT or DESCRIBE query: a set of triples. */
export interface ConstructResult {
  type: "construct";
  triples: Triple[];
}

/** Result of an ASK query: a boolean. */
export interface AskResult {
  type: "ask";
  result: boolean;
}

/** Discriminated union of all SPARQL query result types. */
export type QueryResult = SelectResult | ConstructResult | AskResult;

// ---------------------------------------------------------------------------
// Query type inference
//
// These type-level utilities inspect the literal string type of a SPARQL query
// and infer which result type it will produce. This happens entirely at compile
// time — there is zero runtime cost.
//
// Example:
//   const result = await store.query(sparql`SELECT ?name WHERE { ... }`);
//   //    ^? SelectResult  (not QueryResult — TypeScript narrows it)
//
// How it works:
// 1. `sparql\`SELECT ...\`` captures the literal type `"SELECT ..."`
// 2. `SPARQL<"SELECT ...">` carries the string as a type parameter
// 3. `store.query<Q>()` passes Q to `InferQueryResult<Q>`
// 4. `InferQueryResult` strips PREFIX declarations, trims whitespace, and
//    checks if the uppercase string starts with SELECT, CONSTRUCT, or ASK
// 5. The matching result interface is returned as the type
//
// If the query string is dynamic (plain `string`, not a literal), inference
// falls back to the full `QueryResult` union — the consumer must narrow manually.
// ---------------------------------------------------------------------------

/** Recursively strips leading whitespace from a string type. */
type TrimLeft<S extends string> = S extends ` ${infer R}`
  ? TrimLeft<R>
  : S extends `\n${infer R}`
    ? TrimLeft<R>
    : S extends `\t${infer R}`
      ? TrimLeft<R>
      : S extends `\r${infer R}`
        ? TrimLeft<R>
        : S;

/** Checks if the trimmed, uppercased string starts with "SELECT". */
type StartsWithSelect<Q extends string> =
  TrimLeft<Uppercase<Q>> extends `SELECT${string}` ? true : false;

/** Checks if the trimmed, uppercased string starts with "CONSTRUCT". */
type StartsWithConstruct<Q extends string> =
  TrimLeft<Uppercase<Q>> extends `CONSTRUCT${string}` ? true : false;

/** Checks if the trimmed, uppercased string starts with "ASK". */
type StartsWithAsk<Q extends string> =
  TrimLeft<Uppercase<Q>> extends `ASK${string}` ? true : false;

/**
 * Recursively strips PREFIX declarations from the beginning of a query string.
 * SPARQL queries often start with `PREFIX foo: <...>` before the actual verb.
 * This type strips those so we can inspect the verb (SELECT/CONSTRUCT/ASK).
 */
type StripPrefixes<Q extends string> =
  TrimLeft<Uppercase<Q>> extends `PREFIX${string}>${infer Rest}`
    ? StripPrefixes<Rest>
    : Q;

/**
 * Infers the query result type from a SPARQL query string at compile time.
 *
 * - `"SELECT ..."` → `SelectResult`
 * - `"CONSTRUCT ..."` → `ConstructResult`
 * - `"ASK ..."` → `AskResult`
 * - anything else → `QueryResult` (full union, consumer must narrow)
 */
export type InferQueryResult<Q extends string> =
  StartsWithSelect<StripPrefixes<Q>> extends true
    ? SelectResult
    : StartsWithConstruct<StripPrefixes<Q>> extends true
      ? ConstructResult
      : StartsWithAsk<StripPrefixes<Q>> extends true
        ? AskResult
        : QueryResult;

// ---------------------------------------------------------------------------
// Plugin context
//
// A privileged handle passed to plugin lifecycle hooks that need store access.
// It provides read access via `query()` and controlled write access via
// `update()` and `load()`. This is NOT the public Store — it deliberately
// omits `reload()` and `dispose()` to prevent infinite loops and misuse.
//
// Plugins should NOT store references to this context beyond the hook
// invocation — it is scoped to the lifecycle event.
// ---------------------------------------------------------------------------

/**
 * A context object passed to plugin lifecycle hooks that need store access.
 * Provides read access via `query()` and controlled write access via
 * `update()` and `load()`.
 */
export interface PluginContext {
  /** Execute a read-only SPARQL query (same semantics as Store.query). */
  query<Q extends string>(sparql: SPARQL<Q>): Promise<InferQueryResult<Q>>;

  /**
   * Execute a SPARQL UPDATE operation (INSERT DATA, DELETE DATA, etc.).
   * Use for injecting computed triples into the store.
   */
  update(sparql: string): void;

  /**
   * Load raw RDF content into the store, optionally into a named graph.
   * Equivalent to loading a source file but from a string.
   */
  load(
    content: string,
    options?: {
      format?: "turtle" | "ntriples" | "rdfxml";
      graph?: string;
    },
  ): void;

  /** The registered prefix map (readonly). */
  prefixes: Readonly<PrefixMap>;
}

// ---------------------------------------------------------------------------
// Plugin interface
//
// Plugins hook into store lifecycle events, called in array order:
//
// 1. onLoad(source)   — per source file, after reading, before Oxigraph parse.
// 2. onReady(ctx)     — once after ALL sources loaded. Store is queryable.
//                       Return a value to expose it as the plugin's API.
// 3. onQuery(sparql)  — before each query. Return modified string or void.
// 4. onResult(result) — after each query. Return modified result or void.
// 5. onReload(ctx)    — after a reload() completes. Same as onReady.
// 6. onDispose()      — on store disposal. Runs in reverse plugin order.
//
// The generic `TApi` parameter types the return value of `onReady` and
// `onReload`. The returned value is stored and accessible to consumers via
// `store.api<TApi>("pluginName")`. Defaults to `void` — existing plugins
// that don't return anything continue to work unchanged.
// ---------------------------------------------------------------------------

/** A ke plugin that hooks into store lifecycle events. */
export interface Plugin<TApi = void> {
  /** Unique name for this plugin. Used for error attribution and API lookup. */
  name: string;

  /**
   * Called for each source file after reading, before Oxigraph parsing.
   * Receives both the resolved source and the plugin context.
   */
  onLoad?(source: ResolvedSource, ctx: PluginContext): Promise<void> | void;

  /**
   * Called once after ALL sources have been loaded and parsed.
   * The store is fully populated and queryable. Use `ctx.update()` or
   * `ctx.load()` to inject computed triples.
   *
   * Return a value to expose it as the plugin's API via `store.api()`.
   */
  onReady?(ctx: PluginContext): Promise<TApi> | TApi | undefined;

  /**
   * Called before query execution. Receives the query string
   * (with prefixes expanded) and the plugin context.
   * Return a modified query string, or undefined.
   */
  onQuery?(sparql: string, ctx: PluginContext): string | undefined;

  /**
   * Called after query execution. Receives the parsed result
   * and the plugin context. Return a modified result, or undefined.
   */
  onResult?(result: QueryResult, ctx: PluginContext): QueryResult | undefined;

  /**
   * Called after a `reload()` completes and all sources are re-loaded.
   * Same capabilities as `onReady`. Returned value replaces the plugin API.
   */
  onReload?(ctx: PluginContext): Promise<TApi> | TApi | undefined;

  /** Called when the store is disposed. Use for cleanup (timers, handles). */
  onDispose?(): void;
}

// ---------------------------------------------------------------------------
// Store interface
//
// The Store is what consumers interact with after calling `createStore()`.
// It is a thin wrapper around an Oxigraph WASM store with prefix expansion,
// plugin hooks, and cache support layered on top.
// ---------------------------------------------------------------------------

/** The ke store — query, reload, and inspect a triple store. */
export interface Store {
  /**
   * Execute a SPARQL query against the store.
   *
   * The return type is narrowed at compile time based on the query string:
   * - `sparql\`SELECT ...\`` → `SelectResult`
   * - `sparql\`CONSTRUCT ...\`` → `ConstructResult`
   * - `sparql\`ASK ...\`` → `AskResult`
   *
   * Queries always run with `use_default_graph_as_union: true`, meaning
   * triples from all named graphs are visible unless you explicitly scope
   * with a GRAPH clause.
   */
  query<Q extends string>(sparql: SPARQL<Q>): Promise<InferQueryResult<Q>>;

  /**
   * Reload the store from its configured sources.
   * Clears all triples and re-reads source files.
   * Pass `{ force: true }` to bypass the cache.
   */
  reload(options?: ReloadOptions): Promise<void>;

  /**
   * Dispose the store and release resources.
   * The store should not be used after calling dispose().
   */
  dispose(): void;

  /** The registered prefix map (readonly). See PrefixMap documentation. */
  prefixes: Readonly<PrefixMap>;

  /**
   * Access a plugin's exposed API by plugin name.
   * Returns undefined if the plugin doesn't exist or didn't expose an API.
   *
   * @example
   * ```ts
   * const stats = store.api<StatsApi>("stats");
   * if (stats) {
   *   const counts = stats.getCounts();
   * }
   * ```
   */
  api<T = unknown>(pluginName: string): T | undefined;
}
