// =============================================================================
// @canonical/ke — Store creation and implementation
//
// This is the core of ke. The `createStore()` function is the sole entry point.
// It boots an Oxigraph WASM triple store, loads RDF sources, wires
// up plugins and prefixes, and returns a Store interface.
//
// Architecture:
//   createStore(config) → [load Oxigraph WASM] → [resolve sources] → [parse TTL]
//     → [run onLoad plugins] → [run onReady plugins] → [write cache] → KeStore
//
// The KeStore class wraps the Oxigraph Store with:
//   - Automatic prefix expansion (PREFIX declarations prepended to queries)
//   - Plugin hooks (onLoad, onReady, onQuery, onResult, onReload, onDispose)
//   - Query result parsing into discriminated union types
//   - Named graph support via use_default_graph_as_union
//   - N-Quads cache for fast subsequent boots
//   - Plugin API exposure via store.api()
// =============================================================================

import {
  existsSync,
  globSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, resolve } from "node:path";
import type {
  AskResult,
  Binding,
  ConstructResult,
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
} from "./types.js";

// ---------------------------------------------------------------------------
// Oxigraph type aliases
//
// We import Oxigraph's types via `import("oxigraph")` to avoid pulling the
// WASM module at import time. Oxigraph is loaded dynamically in createStore().
// ---------------------------------------------------------------------------

type OxTerm = import("oxigraph").Term;
type OxQuad = import("oxigraph").Quad;
type OxNamedNode = import("oxigraph").NamedNode;
type OxStore = import("oxigraph").Store;

// ---------------------------------------------------------------------------
// Format mapping
//
// Maps ke's format names to the MIME types that Oxigraph's load() expects.
// Oxigraph uses MIME types internally; we expose friendlier names in the API.
// ---------------------------------------------------------------------------

const FORMAT_MAP: Record<string, string> = {
  turtle: "text/turtle",
  ntriples: "application/n-triples",
  rdfxml: "application/rdf+xml",
};

/**
 * Infer the RDF serialization format from a file's extension.
 * Defaults to Turtle (.ttl) for unknown extensions — Turtle is the most
 * common format in the design system data.
 */
function inferFormat(filePath: string): "turtle" | "ntriples" | "rdfxml" {
  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case ".nt":
    case ".ntriples":
      return "ntriples";
    case ".rdf":
    case ".xml":
    case ".rdfxml":
      return "rdfxml";
    default:
      return "turtle";
  }
}

// ---------------------------------------------------------------------------
// Source resolution
//
// Sources go through two stages:
// 1. Normalize: convert string shortcuts to SourceConfig objects
// 2. Resolve: expand glob patterns to file paths, read file contents
//
// The result is an array of ResolvedSource objects — each containing the
// file content as a string, ready to be parsed by Oxigraph.
// ---------------------------------------------------------------------------

/** Convert a SourceSpec (string or SourceConfig) to a normalized SourceConfig. */
function normalizeSource(spec: SourceSpec): SourceConfig {
  if (typeof spec === "string") {
    return { patterns: [spec] };
  }
  return spec;
}

/**
 * Resolve an array of file path patterns (literal paths or globs) to
 * absolute file paths. Non-existent literal paths are silently skipped.
 *
 * @note Impure — reads filesystem to resolve glob patterns and check existence.
 */
function resolveGlobsSync(patterns: string[]): string[] {
  const files: string[] = [];
  for (const pattern of patterns) {
    // Detect glob patterns by the presence of wildcard characters
    if (
      pattern.includes("*") ||
      pattern.includes("?") ||
      pattern.includes("[")
    ) {
      for (const file of globSync(pattern)) {
        files.push(resolve(file));
      }
    } else {
      // Literal file path — resolve to absolute and verify it exists
      const absPath = resolve(pattern);
      if (existsSync(absPath)) {
        files.push(absPath);
      }
    }
  }
  return files;
}

/**
 * Resolve all source specs to their file contents. Each source's glob patterns
 * are expanded, files are read from disk, and format is inferred or applied.
 *
 * @note Impure — reads file contents from disk.
 */
function resolveSources(specs: SourceSpec[]): ResolvedSource[] {
  const resolved: ResolvedSource[] = [];

  for (const spec of specs) {
    const config = normalizeSource(spec);
    const files = resolveGlobsSync(config.patterns);

    for (const filePath of files) {
      const format = config.format ?? inferFormat(filePath);
      const content = readFileSync(filePath, "utf-8");

      resolved.push({
        path: filePath,
        graph: config.graph,
        format,
        content,
      });
    }
  }

  return resolved;
}

// ---------------------------------------------------------------------------
// Query result parsing
//
// Instead of parsing the SPARQL query string to determine the query form
// (SELECT/CONSTRUCT/ASK), we inspect the shape of Oxigraph's return value.
// This is robust — no regex, no parsing, no edge cases with # in IRIs or
// PREFIX declarations.
//
// Oxigraph returns:
// - boolean → ASK query
// - Array of Map<string, Term> → SELECT query
// - Array of Quad (objects with .subject) → CONSTRUCT or DESCRIBE query
// - string → when results_format is specified (we don't use this)
//
// parseRawResult() is used by both KeStore.query() and PluginContext.query()
// to avoid duplicating the detection + conversion logic.
// ---------------------------------------------------------------------------

/**
 * Parse Oxigraph's raw query result into ke's discriminated union type.
 * Detects the result type by inspecting the return value shape, then
 * converts RDF/JS terms to plain strings.
 */
function parseRawResult(rawResult: unknown): QueryResult {
  // ASK queries return a boolean
  if (typeof rawResult === "boolean") {
    return { type: "ask", result: rawResult } satisfies AskResult;
  }

  // SELECT and CONSTRUCT both return arrays, but with different element types
  if (Array.isArray(rawResult)) {
    // Empty result — could be either. Default to select (more common).
    if (rawResult.length === 0) {
      return {
        type: "select",
        variables: [],
        bindings: [],
      } satisfies SelectResult;
    }

    // SELECT returns Map<string, Term> entries
    if (rawResult[0] instanceof Map) {
      const bindings = rawResult as Map<string, OxTerm>[];
      const variables: string[] =
        bindings.length > 0 ? Array.from(bindings[0]!.keys()) : [];
      const mappedBindings: Binding[] = bindings.map((binding) => {
        const obj: Binding = {};
        for (const [key, value] of binding) {
          obj[key] = termToString(value);
        }
        return obj;
      });
      return {
        type: "select",
        variables,
        bindings: mappedBindings,
      } satisfies SelectResult;
    }

    // CONSTRUCT/DESCRIBE returns Quad objects (have a .subject property)
    if (typeof rawResult[0] === "object" && "subject" in rawResult[0]) {
      const quads = rawResult as OxQuad[];
      const triples: Triple[] = quads.map((quad) => ({
        subject: termToString(quad.subject),
        predicate: termToString(quad.predicate),
        object: termToString(quad.object),
      }));
      return { type: "construct", triples } satisfies ConstructResult;
    }
  }

  // Fallback — shouldn't happen with valid SPARQL
  return {
    type: "select",
    variables: [],
    bindings: [],
  } satisfies SelectResult;
}

// ---------------------------------------------------------------------------
// Prefix expansion
//
// Before each query, we prepend PREFIX declarations from the store's PrefixMap.
// This allows queries to use short prefixed names (ds:UIBlock) without
// manually writing PREFIX declarations each time.
//
// Important: this prepends unconditionally. If the query already declares
// a prefix, the duplicate is harmless — SPARQL allows redeclaration, and
// the last declaration wins. In practice, queries using the sparql`` tagged
// template don't include their own PREFIX declarations.
// ---------------------------------------------------------------------------

/**
 * Prepend PREFIX declarations from the prefix map to a SPARQL query string.
 * If the prefix map is empty, returns the query unchanged.
 */
function expandPrefixes(queryStr: string, prefixes: PrefixMap): string {
  const prefixDeclarations = Object.entries(prefixes)
    .map(([prefix, iri]) => `PREFIX ${prefix}: <${iri}>`)
    .join("\n");

  if (prefixDeclarations.length > 0) {
    return `${prefixDeclarations}\n${queryStr}`;
  }
  return queryStr;
}

// ---------------------------------------------------------------------------
// RDF/JS term conversion
//
// Oxigraph returns RDF/JS-compatible term objects (NamedNode, Literal,
// BlankNode). We convert these to plain strings for the ke API — consumers
// don't need to know about the RDF/JS term model.
// ---------------------------------------------------------------------------

/**
 * Convert an Oxigraph RDF/JS term to its string representation.
 * - NamedNode → the IRI string (e.g., "http://schema.org/name")
 * - Literal → the lexical value (e.g., "Alice", "42")
 * - BlankNode → "_:" prefixed (e.g., "_:b0")
 */
function termToString(term: OxTerm): string {
  switch (term.termType) {
    case "NamedNode":
      return term.value;
    case "Literal":
      return term.value;
    case "BlankNode":
      return `_:${term.value}`;
    default:
      return term.value;
  }
}

// ---------------------------------------------------------------------------
// Plugin context
//
// A PluginContext is a privileged handle given to plugin lifecycle hooks.
// It wraps the Oxigraph store and exposes query + controlled write access
// without exposing reload/dispose (which would cause infinite loops).
//
// The context's query() does NOT run onQuery/onResult hooks — plugin queries
// bypass other plugins to avoid surprising cross-talk.
// ---------------------------------------------------------------------------

/**
 * Create a PluginContext that wraps the Oxigraph store.
 * Used by onLoad, onReady, onReload, onQuery, and onResult hooks.
 */
function createPluginContext(
  oxStore: OxStore,
  oxNamedNode: (value: string) => OxNamedNode,
  prefixes: PrefixMap,
): PluginContext {
  return {
    async query<Q extends string>(
      sparqlQuery: SPARQL<Q>,
    ): Promise<InferQueryResult<Q>> {
      let queryStr = sparqlQuery as string;
      queryStr = expandPrefixes(queryStr, prefixes);

      const rawResult = oxStore.query(queryStr, {
        use_default_graph_as_union: true,
      });

      return parseRawResult(rawResult) as InferQueryResult<Q>;
    },

    update(sparql: string): void {
      oxStore.update(sparql);
    },

    load(
      content: string,
      options?: {
        format?: "turtle" | "ntriples" | "rdfxml";
        graph?: string;
      },
    ): void {
      const mimeType =
        FORMAT_MAP[options?.format ?? "turtle"] ?? "text/turtle";
      if (options?.graph) {
        oxStore.load(content, {
          format: mimeType,
          to_graph_name: oxNamedNode(options.graph),
        });
      } else {
        oxStore.load(content, { format: mimeType });
      }
    },

    prefixes,
  };
}

// ---------------------------------------------------------------------------
// KeStore — the internal Store implementation
// ---------------------------------------------------------------------------

/**
 * Internal Store implementation wrapping an Oxigraph WASM store.
 *
 * This class is not exported — consumers interact with the Store interface.
 * createStore() is the only way to create an instance.
 */
class KeStore implements Store {
  private oxStore: OxStore;
  private config: StoreConfig;
  private _prefixes: PrefixMap;
  private plugins: Plugin[];
  private oxNamedNode: (value: string) => OxNamedNode;
  private pluginApis: Map<string, unknown>;

  constructor(
    oxStore: OxStore,
    config: StoreConfig,
    prefixes: PrefixMap,
    plugins: Plugin[],
    oxNamedNode: (value: string) => OxNamedNode,
  ) {
    this.oxStore = oxStore;
    this.config = config;
    this._prefixes = { ...prefixes }; // Shallow copy — consumer can't mutate
    this.plugins = plugins;
    this.oxNamedNode = oxNamedNode; // Held for reload(), which needs to create NamedNodes
    this.pluginApis = new Map();
  }

  get prefixes(): Readonly<PrefixMap> {
    return this._prefixes;
  }

  api<T = unknown>(pluginName: string): T | undefined {
    return this.pluginApis.get(pluginName) as T | undefined;
  }

  /** @internal — used by createStore() to set plugin APIs after onReady. */
  setPluginApi(name: string, value: unknown): void {
    this.pluginApis.set(name, value);
  }

  async query<Q extends string>(
    sparqlQuery: SPARQL<Q>,
  ): Promise<InferQueryResult<Q>> {
    let queryStr = sparqlQuery as string;

    // Step 1: Prepend registered PREFIX declarations
    queryStr = expandPrefixes(queryStr, this._prefixes);

    // Step 2: Create plugin context for hooks that need it
    const ctx = createPluginContext(
      this.oxStore,
      this.oxNamedNode,
      this._prefixes,
    );

    // Step 3: Run onQuery plugin hooks (in array order)
    // Plugins can rewrite the query string, e.g., to add LIMIT clauses
    for (const plugin of this.plugins) {
      if (plugin.onQuery) {
        const modified = plugin.onQuery(queryStr, ctx);
        if (typeof modified === "string") {
          queryStr = modified;
        }
      }
    }

    // Step 4: Execute via Oxigraph
    // use_default_graph_as_union: true makes all named graphs visible by default,
    // so you don't need explicit GRAPH clauses to query across graphs
    const rawResult = this.oxStore.query(queryStr, {
      use_default_graph_as_union: true,
    });

    // Step 5: Parse into discriminated union
    let result = parseRawResult(rawResult);

    // Step 6: Run onResult plugin hooks (in array order)
    // Plugins can transform results, e.g., to add computed fields
    for (const plugin of this.plugins) {
      if (plugin.onResult) {
        const modified = plugin.onResult(result, ctx);
        if (modified) {
          result = modified;
        }
      }
    }

    return result as InferQueryResult<Q>;
  }

  async reload(options?: ReloadOptions): Promise<void> {
    const force = options?.force ?? false;

    // If not forced and cache is configured, try loading from cache first
    if (!force && this.config.cache) {
      const loaded = tryLoadCache(this.oxStore, this.config.cache);
      if (loaded) return;
    }

    // Clear all triples from the store before reloading
    this.oxStore.update("CLEAR ALL");

    // Create plugin context for hooks
    const ctx = createPluginContext(
      this.oxStore,
      this.oxNamedNode,
      this._prefixes,
    );

    // Re-resolve sources from disk (files may have changed)
    const sources = resolveSources(this.config.sources);

    for (const source of sources) {
      // Run onLoad plugins for each source
      for (const plugin of this.plugins) {
        if (plugin.onLoad) {
          await plugin.onLoad(source, ctx);
        }
      }

      loadSource(this.oxStore, this.oxNamedNode, source);
    }

    // Run onReload plugins after all sources are loaded
    for (const plugin of this.plugins) {
      if (plugin.onReload) {
        const api = await plugin.onReload(ctx);
        if (api !== undefined && api !== null) {
          this.pluginApis.set(plugin.name, api);
        }
      }
    }

    // Write cache AFTER plugins have injected their computed triples
    if (this.config.cache) {
      writeCache(this.oxStore, this.config.cache);
    }
  }

  dispose(): void {
    // Run onDispose hooks in reverse order (LIFO, like destructors)
    for (let i = this.plugins.length - 1; i >= 0; i--) {
      const plugin = this.plugins[i]!;
      if (plugin.onDispose) {
        try {
          plugin.onDispose();
        } catch {
          // Swallow errors during dispose — don't break the chain
        }
      }
    }
    this.pluginApis.clear();
  }
}

// ---------------------------------------------------------------------------
// Source loading
// ---------------------------------------------------------------------------

/**
 * Load a single resolved source into the Oxigraph store.
 * If the source specifies a named graph, triples are loaded into that graph.
 * Otherwise they go into the default graph.
 *
 * @note Impure — mutates the Oxigraph store.
 */
function loadSource(
  oxStore: OxStore,
  oxNamedNode: (value: string) => OxNamedNode,
  source: ResolvedSource,
): void {
  const mimeType = FORMAT_MAP[source.format] ?? "text/turtle";

  if (source.graph) {
    oxStore.load(source.content, {
      format: mimeType,
      to_graph_name: oxNamedNode(source.graph),
    });
  } else {
    oxStore.load(source.content, { format: mimeType });
  }
}

// ---------------------------------------------------------------------------
// Cache
//
// The cache serializes the entire store to N-Quads format on first boot.
// On subsequent boots, the N-Quads file is loaded directly into Oxigraph,
// skipping source resolution, file reading, and TTL parsing.
//
// N-Quads is used because it preserves named graph information and is
// Oxigraph's fastest serialization format.
//
// Cache invalidation is manual: consumers call `store.reload({ force: true })`
// or delete the cache file. Automatic invalidation (e.g., mtime checking)
// may be added in a future version.
// ---------------------------------------------------------------------------

/**
 * Try to load the store from a serialized N-Quads cache file.
 * Returns true if the cache was loaded successfully, false otherwise.
 *
 * @note Impure — reads serialized cache from disk into the store.
 */
function tryLoadCache(oxStore: OxStore, cachePath: string): boolean {
  const absPath = resolve(cachePath);
  if (!existsSync(absPath)) return false;

  try {
    const data = readFileSync(absPath, "utf-8");
    oxStore.load(data, { format: "application/n-quads" });
    return true;
  } catch {
    // Cache is corrupted or unreadable — fall through to normal loading.
    return false;
  }
}

/**
 * Serialize the entire store to an N-Quads cache file.
 * Creates parent directories if they don't exist.
 *
 * @note Impure — writes serialized store to disk as N-Quads.
 */
function writeCache(oxStore: OxStore, cachePath: string): void {
  const absPath = resolve(cachePath);
  const dir = dirname(absPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const data = oxStore.dump({ format: "application/n-quads" });
  writeFileSync(absPath, data, "utf-8");
}

// ---------------------------------------------------------------------------
// Oxigraph WASM module loading
// ---------------------------------------------------------------------------

/**
 * Dynamically import the Oxigraph WASM module.
 *
 * We use dynamic import() rather than a top-level import because:
 * 1. Oxigraph is a WASM module that needs initialization
 * 2. Dynamic import allows ke to be imported without triggering WASM loading
 *    (useful for type-only imports, testing, etc.)
 * 3. The consumer controls when the WASM cost is paid (at createStore() time)
 *
 * @note Impure — loads WASM module, triggers WASM initialization.
 */
async function loadOxigraph() {
  try {
    return await import("oxigraph");
  } catch (error) {
    throw new Error(
      `Failed to load oxigraph. Make sure it is installed: ${error}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Public API — the sole entry point
// ---------------------------------------------------------------------------

/**
 * Create a new ke triple store (sole entry point).
 *
 * This is the only way to create a Store. It:
 * 1. Loads the Oxigraph WASM module
 * 2. Creates a new Oxigraph Store instance
 * 3. Tries to load from cache (if configured)
 * 4. If no cache hit: resolves sources, reads files, runs onLoad plugins,
 *    parses TTL into the store
 * 5. Runs onReady plugins (can query/inject computed data)
 * 6. Writes cache (after plugins, so injected triples are cached)
 * 7. Returns a Store interface with prefix expansion and plugin hooks
 *
 * @note Impure — reads TTL files from disk, loads WASM module, writes cache.
 *
 * @example
 * ```ts
 * const store = await createStore({
 *   sources: [
 *     "./ontology.ttl",
 *     { patterns: ["./data/*.ttl"], graph: "urn:pragma:data" },
 *   ],
 *   prefixes: {
 *     ds: "https://ds.canonical.com/",
 *     cso: "http://pragma.canonical.com/codestandards#",
 *   },
 *   plugins: [statsPlugin()],
 *   cache: "./.cache/ke-store.nq",
 * });
 *
 * const result = await store.query(sparql`SELECT ?name WHERE { ?c a ds:UIBlock ; ds:name ?name }`);
 * // result.type === "select"
 * // result.bindings === [{ name: "Button" }, { name: "Card" }, ...]
 *
 * store.dispose();
 * ```
 */
export default async function createStore(config: StoreConfig): Promise<Store> {
  const oxigraph = await loadOxigraph();
  const oxStore = new oxigraph.Store();

  const prefixes = config.prefixes ?? {};
  const plugins = config.plugins ?? [];

  // Try cache first — if it hits, we skip all source resolution and parsing
  let loadedFromCache = false;
  if (config.cache) {
    loadedFromCache = tryLoadCache(oxStore, config.cache);
  }

  // Create plugin context for lifecycle hooks
  const ctx = createPluginContext(oxStore, oxigraph.namedNode, prefixes);

  // No cache hit — resolve sources, run plugins, load into Oxigraph
  if (!loadedFromCache) {
    const sources = resolveSources(config.sources);

    for (const source of sources) {
      // Run onLoad plugin hooks before Oxigraph parses the content
      for (const plugin of plugins) {
        if (plugin.onLoad) {
          await plugin.onLoad(source, ctx);
        }
      }

      loadSource(oxStore, oxigraph.namedNode, source);
    }
  }

  // Create the store instance
  const store = new KeStore(
    oxStore,
    config,
    prefixes,
    plugins,
    oxigraph.namedNode,
  );

  // Run onReady plugins — store is fully populated and queryable.
  // Skipped on cache hit only if onReady is not defined — if a plugin
  // has onReady, it always runs (it may compute derived data or APIs).
  for (const plugin of plugins) {
    if (plugin.onReady) {
      const api = await plugin.onReady(ctx);
      if (api !== undefined && api !== null) {
        store.setPluginApi(plugin.name, api);
      }
    }
  }

  // Write cache AFTER onReady plugins, so plugin-injected triples are cached
  if (!loadedFromCache && config.cache) {
    writeCache(oxStore, config.cache);
  }

  return store;
}
