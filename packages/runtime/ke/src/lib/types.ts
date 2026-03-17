/**
 * Branded types for type-safe RDF operations (TP.01)
 */

declare const URIBrand: unique symbol;
export type URI = string & { [URIBrand]: true };

declare const SPARQLBrand: unique symbol;
export type SPARQL<Q extends string = string> = Q & { [SPARQLBrand]: true };

declare const GraphNameBrand: unique symbol;
export type GraphName = string & { [GraphNameBrand]: true };

/**
 * Prefix map for namespace registration (KE.07)
 */
export type PrefixMap = Record<string, string>;

/**
 * Source specification types
 */
export interface SourceConfig {
  patterns: string[];
  graph?: string;
  format?: "turtle" | "ntriples" | "rdfxml";
}

export type SourceSpec = string | SourceConfig;

/**
 * Store configuration
 */
export interface StoreConfig {
  sources: SourceSpec[];
  plugins?: Plugin[];
  prefixes?: PrefixMap;
  cache?: string;
}

/**
 * Resolved source after glob expansion
 */
export interface ResolvedSource {
  path: string;
  graph?: string;
  format: "turtle" | "ntriples" | "rdfxml";
  content: string;
}

/**
 * Reload options
 */
export interface ReloadOptions {
  force?: boolean;
}

/**
 * Triple representation
 */
export interface Triple {
  subject: string;
  predicate: string;
  object: string;
}

/**
 * Binding map for SELECT query results
 */
export type Binding = Record<string, string>;

/**
 * Discriminated query result types (TP.03)
 */
export interface SelectResult {
  type: "select";
  variables: string[];
  bindings: Binding[];
}

export interface ConstructResult {
  type: "construct";
  triples: Triple[];
}

export interface AskResult {
  type: "ask";
  result: boolean;
}

export type QueryResult = SelectResult | ConstructResult | AskResult;

/**
 * Query type inference via template literal types (TP.04)
 *
 * Uses TypeScript intrinsic Uppercase to normalize the query string
 * and infer the result type based on the SPARQL verb.
 */
type TrimLeft<S extends string> = S extends ` ${infer R}`
  ? TrimLeft<R>
  : S extends `\n${infer R}`
    ? TrimLeft<R>
    : S extends `\t${infer R}`
      ? TrimLeft<R>
      : S extends `\r${infer R}`
        ? TrimLeft<R>
        : S;

type StartsWithSelect<Q extends string> =
  TrimLeft<Uppercase<Q>> extends `SELECT${string}` ? true : false;
type StartsWithConstruct<Q extends string> =
  TrimLeft<Uppercase<Q>> extends `CONSTRUCT${string}` ? true : false;
type StartsWithAsk<Q extends string> =
  TrimLeft<Uppercase<Q>> extends `ASK${string}` ? true : false;

/**
 * Infers the query result type from a SPARQL query string.
 * Handles PREFIX declarations by stripping them first.
 */
type StripPrefixes<Q extends string> =
  TrimLeft<Uppercase<Q>> extends `PREFIX${string}>${infer Rest}`
    ? StripPrefixes<Rest>
    : Q;

export type InferQueryResult<Q extends string> =
  StartsWithSelect<StripPrefixes<Q>> extends true
    ? SelectResult
    : StartsWithConstruct<StripPrefixes<Q>> extends true
      ? ConstructResult
      : StartsWithAsk<StripPrefixes<Q>> extends true
        ? AskResult
        : QueryResult;

/**
 * Plugin interface (TP.05)
 */
export interface Plugin {
  name: string;
  onLoad?(source: ResolvedSource): Promise<void> | void;
  onQuery?(sparql: string): string | void;
  onResult?(result: QueryResult): QueryResult | void;
}

/**
 * Store interface
 */
export interface Store {
  query<Q extends string>(sparql: SPARQL<Q>): Promise<InferQueryResult<Q>>;
  reload(options?: ReloadOptions): Promise<void>;
  dispose(): void;
  prefixes: Readonly<PrefixMap>;
}
