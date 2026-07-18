/**
 * The public library surface of @canonical/ke-graphql, composed from the
 * domain barrels: the compiler pipeline and its artifact codec, the ke
 * plugin, local/static execution, and the connection helpers. The internal
 * cross-domain surface (loaders, vocabulary constants, resolver templates)
 * is deliberately not re-exported.
 *
 * @module lib
 */

export {
  ARTIFACT_VERSION,
  type CardinalitySpec,
  type ClassNode,
  CompilationError,
  type CompilerContext,
  type CompilerResult,
  type ContextFactory,
  type CustomMapping,
  type CustomMappings,
  compile,
  compileFromExtraction,
  createContextFactory,
  createStoreQueryFn,
  type Diagnostic,
  type DiagnosticCode,
  type DiagnosticSeverity,
  deserializeExtraction,
  type EntityValue,
  hashSources,
  type InstanceStats,
  type MappedField,
  type MappedInterface,
  type MappedIR,
  type MappedType,
  type NameMap,
  type NamespaceInfo,
  type NonNullOverrides,
  type OntologyIR,
  type PassResult,
  type PropertyNode,
  pluralize,
  type QueryFn,
  type RangeSpec,
  type RawExtraction,
  type ResolverTemplate,
  type RuntimeWarningHandler,
  type SchemaExtensions,
  type SchemaExtensionsInput,
  type SchemaPluginApi,
  type SchemaPluginOptions,
  type SerializedExtraction,
  serializeExtraction,
  stripVerbPrefix,
  type TripleSet,
  type TripleValue,
} from "./compiler/index.js";
export {
  default as createSchemaPlugin,
  type SchemaPluginExtra,
} from "./createSchemaPlugin.js";
export { toFull, toPrefixed } from "./dataloader/index.js";
export {
  createPersistedManifest,
  executeLocal,
  extractStatic,
  type IncrementalResults,
  isIncrementalResults,
  type LocalExecutionResult,
  mergeIncremental,
  type RelayLegacyPayload,
  relayFormatAdapter,
  type StaticQuery,
  sha256Hex,
} from "./execution/index.js";
export {
  clampConnectionArgs,
  createDepthLimitRule,
  DEFAULT_MAX_QUERY_DEPTH,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PROCESS_CACHE_SIZE,
  isSafeIri,
  MAX_PAGE_SIZE,
  maskError,
} from "./hardening/index.js";
export {
  type Connection,
  type ConnectionArgs,
  connectionFromPage,
  emptyConnection,
  fromBase64,
  isEntity,
  paginateUriWindow,
  toBase64,
  toConnection,
  type UriPage,
  unwrapEntities,
} from "./resolver/index.js";
