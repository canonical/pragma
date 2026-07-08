// =============================================================================
// @canonical/ke-graphql — Compiler API type contracts
//
// The options and result shapes of the seven-pass pipeline's public entry
// points (compile, the schema plugin, the artifact codec). The IR/value/
// context contracts these build on live in the shared leaf (#shared) and are
// re-exported from the compiler barrel for the package's public surface.
// =============================================================================

import type { Store } from "@canonical/ke";
import type { GraphQLFieldConfig, GraphQLSchema } from "graphql";
import type {
  CompilerContext,
  Diagnostic,
  InstanceStats,
  MappedIR,
  NameMap,
  RawExtraction,
  RuntimeWarningHandler,
} from "../shared/index.js";
import type { ARTIFACT_VERSION } from "./constants.js";

/**
 * The JSON shape of a serialized extraction artifact: RawExtraction with its
 * Maps and Sets flattened to arrays, plus the artifact format version and
 * the fingerprint of the TTL sources it was built from.
 */
export interface SerializedExtraction {
  version: typeof ARTIFACT_VERSION;
  /** Combined fingerprint of the TTL sources the extraction was built from. */
  sourcesHash: string;
  classes: RawExtraction["classes"];
  properties: RawExtraction["properties"];
  inverses: RawExtraction["inverses"];
  functionals: string[];
  datatypes: RawExtraction["datatypes"];
  namespaces: Array<[string, string]>;
  shaclConstraints: RawExtraction["shaclConstraints"];
  unions: RawExtraction["unions"];
  instanceStats: Array<[string, InstanceStats]>;
  selfReferential: string[];
  functionalViolations: string[];
  undeclaredPredicates: string[];
  annotations: Array<[string, Array<[string, string]>]>;
  deepBlankNesting: boolean;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

/** Per-URI override of the generated mapping (rename, cardinality, shape). */
export interface CustomMapping {
  graphqlName?: string;
  singular?: boolean;
  abstract?: boolean;
  embeddable?: boolean;
  /** Synthesize an inverse field on the property's range type. */
  inverse?: { graphqlName: string };
}

/** Custom mappings keyed by full IRI or prefixed name (e.g. "ds:tier"). */
export type CustomMappings = Record<string, CustomMapping>;

/** Per GraphQL type name: the field names promoted to non-null. */
export type NonNullOverrides = Record<string, string[]>;

/** Consumer-supplied extension fields, keyed by GraphQL type name. */
export interface SchemaExtensions {
  [typeName: string]: Record<
    string,
    // biome-ignore lint/suspicious/noExplicitAny: graphql-js field configs are consumer-typed
    GraphQLFieldConfig<any, CompilerContext>
  >;
}

/**
 * Extensions may need the compiler-generated types (e.g. an `anatomy` field
 * typed as the generated Specification). The factory form receives a lookup
 * for generated types and interfaces by name.
 */
export type SchemaExtensionsInput =
  | SchemaExtensions
  | ((types: {
      type(name: string): import("graphql").GraphQLObjectType | undefined;
      iface(name: string): import("graphql").GraphQLInterfaceType | undefined;
    }) => SchemaExtensions);

/** Options accepted by the schema plugin and the compile entry points. */
export interface SchemaPluginOptions {
  mappings?: CustomMappings;
  extensions?: SchemaExtensionsInput;
  /** Wire the Node interface, global IDs, and connections. Default: true. */
  relay?: boolean;
  /** Add @defer/@stream directives to the schema. Default: false. */
  incremental?: boolean;
  /** File path for SDL output. */
  sdlOutput?: string;
  nonNullOverrides?: NonNullOverrides;
  /**
   * Opt-in instance-level standard-vocabulary fields.
   * Per GraphQL type name: predicate URI → field name.
   */
  standardVocabFields?: Record<string, Record<string, string>>;
  /** Resolver-time warnings (coercion failures). Default: console.warn, deduplicated. */
  onRuntimeWarning?: RuntimeWarningHandler;
  /**
   * DataLoader cache scope. "request" (default): fresh caches per
   * createContext call. "process": LRU caches shared across contexts for the
   * lifetime of this CompilerResult — sound because the store is immutable
   * between reloads, and onReload produces a new result (auto-invalidation).
   * Bounded (see processCacheSize) so enumeration can't grow them without
   * limit; failed batches are evicted, never memoized.
   */
  loaderCache?: "request" | "process";
  /**
   * Maximum entries per process-lifetime loader cache (LRU), used only when
   * loaderCache is "process". Default: DEFAULT_PROCESS_CACHE_SIZE.
   */
  processCacheSize?: number;
}

/** Everything a successful compilation produces: schema, SDL, IR, context factory. */
export interface CompilerResult {
  schema: GraphQLSchema;
  diagnostics: Diagnostic[];
  nameMap: NameMap;
  /** Empty when compiled from an artifact with assumeValid (printSchema skipped). */
  sdl: string;
  mapped: MappedIR;
  /** The Pass 1 output — serializable via serializeExtraction (artifact boots). */
  extraction: RawExtraction;
  /**
   * Fresh DataLoaders per call ("request" mode) or shared caches
   * ("process" mode). Accepts a Promise for lazy-store boots: TBox
   * queries answer before the store resolves; ABox loaders await it.
   */
  createContext(store: Store | Promise<Store>): CompilerContext;
  /** Drop the shared caches ("process" mode); no-op otherwise. */
  clearLoaderCache(): void;
}

/** The API surface the plugin registers on the ke store under "ke-graphql". */
export interface SchemaPluginApi {
  schema: GraphQLSchema;
  diagnostics: Diagnostic[];
  nameMap: NameMap;
  sdl: string;
  /**
   * Create a fresh CompilerContext (new DataLoaders each call). Takes the
   * store as an argument: ke's PluginContext is scoped to its lifecycle
   * hook and must not be retained for request-time queries.
   */
  createContext(store: Store | Promise<Store>): CompilerContext;
  /** Drop the shared caches ("process" mode); no-op otherwise. */
  clearLoaderCache(): void;
}

/**
 * Creates a fresh CompilerContext per call and exposes cache control for the
 * "process" loader-cache mode.
 */
export interface ContextFactory {
  (store: Store | Promise<Store>): CompilerContext;
  /** Drop the shared caches ("process" mode); no-op otherwise. */
  clearCache(): void;
}
