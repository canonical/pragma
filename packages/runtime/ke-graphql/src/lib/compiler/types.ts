// =============================================================================
// @canonical/ke-graphql — Compiler API type contracts
//
// The options and result shapes of the seven-pass pipeline's public entry
// points (compile, the schema plugin, the artifact codec). The IR/value/
// context contracts these build on live in the shared leaf (../shared) and are
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
  /**
   * The `graphql:` vocabulary assertions (already plain sorted tuples).
   * Optional: artifacts serialized before the vocabulary landed lack the
   * field, and deserialization defaults it to [] — sound because
   * `sourcesHash` already forces a live recompile the moment the sources
   * gain an annotation the artifact has not seen.
   */
  graphqlAnnotations?: RawExtraction["graphqlAnnotations"];
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

/**
 * How much of the ontology is projected into object types.
 *
 * PROVENANCE ONLY TODAY. The extractor emits no `graphql:*` annotations yet
 * (that is a separate task), so there is nothing for this option to gate on
 * and the compiler deliberately does NOT branch on it — a `switch` that
 * silently changes nothing is worse than no knob at all. The value is typed,
 * defaulted, and stamped into the SDL provenance header so a consumer can
 * declare intent now and diff the header later; its EFFECT lands with the
 * annotations task, at which point `auto`/`explicit` start behaving
 * differently from `annotated`.
 *
 * The three mode names are fixed by the schema contract (graphql-schema-spec
 * 1), so `mode:` header lines are comparable across providers.
 */
export type ProjectionMode =
  /** Pure heuristics; annotations ignored. */
  | "auto"
  /** Heuristic baseline; annotations override per term (the default). */
  | "annotated"
  /** Allowlist: only annotated elements are exposed. */
  | "explicit";

/**
 * Field-name prefixing policy. Unlike `mode`, this has real behaviour today.
 *
 * - `"none"` (default) — field names are the mapped OWL local names.
 * - `"all"` — EVERY generated field name is namespace-prefixed
 *   (`ex:uri` → `exUri`). An explicit `mappings[…].graphqlName` is never
 *   prefixed. This is the blanket remedy for an M001/M005 collision: it
 *   resolves the whole schema at once instead of one mapping per clash.
 */
export type FieldPrefixing = "none" | "all";

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
  /**
   * Wire the Relay conventions: Node membership, the injected uri + _meta
   * structural fields, connections, and the root node/lookup/listing query
   * fields. Default: true.
   */
  relay?: boolean;
  /** Add @defer/@stream directives to the schema. Default: false. */
  incremental?: boolean;
  /** File path for SDL output. */
  sdlOutput?: string;
  nonNullOverrides?: NonNullOverrides;
  /**
   * Projection mode. Provenance-only today — see ProjectionMode.
   * Default: DEFAULT_MODE ("annotated").
   */
  mode?: ProjectionMode;
  /**
   * Field-name prefixing policy. Default: DEFAULT_PREFIXING ("none").
   * See FieldPrefixing.
   */
  prefixing?: FieldPrefixing;
  /** Provider identity stamped into the SDL provenance header. */
  provider?: string;
  /** Source revision stamped into the SDL provenance header. */
  revision?: string;
  /**
   * Opt-in instance-level standard-vocabulary fields.
   * Per GraphQL type name: predicate URI → field name.
   *
   * @deprecated Superseded by the `graphql:*From` annotations — declare the
   * source predicate on the ontology term instead of naming it per schema
   * type here. Kept working (and now collision-correct) until they land.
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
