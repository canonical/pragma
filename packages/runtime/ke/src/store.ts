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

type OxTerm = import("oxigraph").Term;
type OxQuad = import("oxigraph").Quad;
type OxNamedNode = import("oxigraph").NamedNode;
type OxStore = import("oxigraph").Store;

const FORMAT_MAP: Record<string, string> = {
  turtle: "text/turtle",
  ntriples: "application/n-triples",
  rdfxml: "application/rdf+xml",
};

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
    case ".ttl":
    case ".turtle":
    default:
      return "turtle";
  }
}

function normalizeSource(spec: SourceSpec): SourceConfig {
  if (typeof spec === "string") {
    return { patterns: [spec] };
  }
  return spec;
}

function resolveGlobsSync(patterns: string[]): string[] {
  const files: string[] = [];
  for (const pattern of patterns) {
    if (
      pattern.includes("*") ||
      pattern.includes("?") ||
      pattern.includes("[")
    ) {
      for (const file of globSync(pattern)) {
        files.push(resolve(file));
      }
    } else {
      const absPath = resolve(pattern);
      if (existsSync(absPath)) {
        files.push(absPath);
      }
    }
  }
  return files;
}

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

function detectQueryType(
  queryStr: string,
): "select" | "construct" | "ask" | "unknown" {
  const stripped = queryStr
    .replace(/#[^\n]*/g, "")
    .replace(/PREFIX\s+\S+:\s*<[^>]*>\s*/gi, "")
    .trim();

  const upper = stripped.toUpperCase();

  if (upper.startsWith("SELECT")) return "select";
  if (upper.startsWith("CONSTRUCT")) return "construct";
  if (upper.startsWith("DESCRIBE")) return "construct";
  if (upper.startsWith("ASK")) return "ask";
  return "unknown";
}

function expandPrefixes(queryStr: string, prefixes: PrefixMap): string {
  const prefixDeclarations = Object.entries(prefixes)
    .map(([prefix, iri]) => `PREFIX ${prefix}: <${iri}>`)
    .join("\n");

  if (prefixDeclarations.length > 0) {
    return `${prefixDeclarations}\n${queryStr}`;
  }
  return queryStr;
}

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

class KeStore implements Store {
  private oxStore: OxStore;
  private config: StoreConfig;
  private _prefixes: PrefixMap;
  private plugins: Plugin[];
  private oxNamedNode: (value: string) => OxNamedNode;

  constructor(
    oxStore: OxStore,
    config: StoreConfig,
    prefixes: PrefixMap,
    plugins: Plugin[],
    oxNamedNode: (value: string) => OxNamedNode,
  ) {
    this.oxStore = oxStore;
    this.config = config;
    this._prefixes = { ...prefixes };
    this.plugins = plugins;
    this.oxNamedNode = oxNamedNode;
  }

  get prefixes(): Readonly<PrefixMap> {
    return this._prefixes;
  }

  async query<Q extends string>(
    sparqlQuery: SPARQL<Q>,
  ): Promise<InferQueryResult<Q>> {
    let queryStr = sparqlQuery as string;

    queryStr = expandPrefixes(queryStr, this._prefixes);

    for (const plugin of this.plugins) {
      if (plugin.onQuery) {
        const modified = plugin.onQuery(queryStr);
        if (typeof modified === "string") {
          queryStr = modified;
        }
      }
    }

    const queryType = detectQueryType(queryStr);
    const rawResult = this.oxStore.query(queryStr, {
      use_default_graph_as_union: true,
    });

    let result: QueryResult;

    switch (queryType) {
      case "select": {
        const bindings = rawResult as Map<string, OxTerm>[];
        const variables: string[] =
          bindings.length > 0 ? Array.from(bindings[0].keys()) : [];
        const mappedBindings: Binding[] = bindings.map((binding) => {
          const obj: Binding = {};
          for (const [key, value] of binding) {
            obj[key] = termToString(value);
          }
          return obj;
        });
        result = {
          type: "select",
          variables,
          bindings: mappedBindings,
        } satisfies SelectResult;
        break;
      }
      case "construct": {
        const quads = rawResult as OxQuad[];
        const triples: Triple[] = quads.map((quad) => ({
          subject: termToString(quad.subject),
          predicate: termToString(quad.predicate),
          object: termToString(quad.object),
        }));
        result = {
          type: "construct",
          triples,
        } satisfies ConstructResult;
        break;
      }
      case "ask": {
        result = {
          type: "ask",
          result: rawResult as boolean,
        } satisfies AskResult;
        break;
      }
      default:
        throw new Error(`Unsupported query type: ${queryType}`);
    }

    for (const plugin of this.plugins) {
      if (plugin.onResult) {
        const modified = plugin.onResult(result);
        if (modified) {
          result = modified;
        }
      }
    }

    return result as InferQueryResult<Q>;
  }

  async reload(options?: ReloadOptions): Promise<void> {
    const force = options?.force ?? false;

    if (!force && this.config.cache) {
      const loaded = tryLoadCache(this.oxStore, this.config.cache);
      if (loaded) return;
    }

    this.oxStore.update("CLEAR ALL");

    const sources = resolveSources(this.config.sources);

    for (const source of sources) {
      for (const plugin of this.plugins) {
        if (plugin.onLoad) {
          await plugin.onLoad(source);
        }
      }

      loadSource(this.oxStore, this.oxNamedNode, source);
    }

    if (this.config.cache) {
      writeCache(this.oxStore, this.config.cache);
    }
  }

  dispose(): void {
    // Oxigraph WASM Store is GC'd — no explicit free needed
  }
}

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

function tryLoadCache(oxStore: OxStore, cachePath: string): boolean {
  const absPath = resolve(cachePath);
  if (!existsSync(absPath)) return false;

  try {
    const data = readFileSync(absPath, "utf-8");
    oxStore.load(data, { format: "application/n-quads" });
    return true;
  } catch {
    return false;
  }
}

function writeCache(oxStore: OxStore, cachePath: string): void {
  const absPath = resolve(cachePath);
  const dir = dirname(absPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const data = oxStore.dump({ format: "application/n-quads" });
  writeFileSync(absPath, data, "utf-8");
}

async function loadOxigraph() {
  try {
    return await import("oxigraph");
  } catch (error) {
    throw new Error(
      `Failed to load oxigraph. Make sure it is installed: ${error}`,
    );
  }
}

/**
 * Create a new ke Store instance (KE.02 — sole entry point).
 */
export async function create(config: StoreConfig): Promise<Store> {
  const oxigraph = await loadOxigraph();
  const oxStore = new oxigraph.Store();

  const prefixes = config.prefixes ?? {};
  const plugins = config.plugins ?? [];

  let loadedFromCache = false;
  if (config.cache) {
    loadedFromCache = tryLoadCache(oxStore, config.cache);
  }

  if (!loadedFromCache) {
    const sources = resolveSources(config.sources);

    for (const source of sources) {
      for (const plugin of plugins) {
        if (plugin.onLoad) {
          await plugin.onLoad(source);
        }
      }

      loadSource(oxStore, oxigraph.namedNode, source);
    }

    if (config.cache) {
      writeCache(oxStore, config.cache);
    }
  }

  return new KeStore(oxStore, config, prefixes, plugins, oxigraph.namedNode);
}
