/**
 * @canonical/ke-graphql — OWL → GraphQL compiler for the ke triple store.
 *
 * The root export is schema + resolvers + local execution only (KG.22):
 * no server, no HTTP, no GraphiQL. The fetch handler lives behind the
 * `@canonical/ke-graphql/http` subpath export.
 *
 * @example
 * ```ts
 * import { createStore } from "@canonical/ke";
 * import { createSchemaPlugin, type SchemaPluginApi } from "@canonical/ke-graphql";
 *
 * const graphql = createSchemaPlugin();
 * const store = await createStore({
 *   sources: ["./ontology.ttl", "./data/*.ttl"],
 *   prefixes: { ds: "https://ds.canonical.com/" },
 *   plugins: [graphql],
 * });
 * const { schema, createContext } = store.api<SchemaPluginApi>("ke-graphql")!;
 * ```
 */

export {
  ARTIFACT_VERSION,
  deserializeExtraction,
  hashSources,
  type SerializedExtraction,
  serializeExtraction,
} from "./compiler/artifact.js";
export {
  CompilationError,
  type ContextFactory,
  compile,
  compileFromExtraction,
  createContextFactory,
  storeQueryFn,
} from "./compiler/index.js";
export type {
  CardinalitySpec,
  ClassNode,
  CompilerContext,
  CompilerResult,
  CustomMapping,
  CustomMappings,
  Diagnostic,
  DiagnosticCode,
  DiagnosticSeverity,
  EntityValue,
  InstanceStats,
  MappedField,
  MappedInterface,
  MappedIR,
  MappedType,
  NameMap,
  NamespaceInfo,
  NonNullOverrides,
  OntologyIR,
  PassResult,
  PropertyNode,
  QueryFn,
  RangeSpec,
  RawExtraction,
  ResolverTemplate,
  RuntimeWarningHandler,
  SchemaExtensions,
  SchemaExtensionsInput,
  SchemaPluginApi,
  SchemaPluginOptions,
  TripleSet,
  TripleValue,
} from "./compiler/types.js";
export { toFull, toPrefixed } from "./dataloader/uris.js";
export type { StaticQuery } from "./execution/extractStatic.js";
export { extractStatic } from "./execution/extractStatic.js";
export type {
  IncrementalResults,
  LocalExecutionResult,
  RelayLegacyPayload,
} from "./execution/incremental.js";
export {
  executeLocal,
  isIncrementalResults,
  mergeIncremental,
  relayFormatAdapter,
} from "./execution/incremental.js";
export {
  createPersistedManifest,
  sha256Hex,
} from "./execution/persisted.js";
export { createSchemaPlugin, type SchemaPluginExtra } from "./plugin.js";
export type { Connection, ConnectionArgs } from "./resolver/connection.js";
export {
  connectionFromPage,
  emptyConnection,
  fromBase64,
  isEntity,
  paginateUriWindow,
  toBase64,
  toConnection,
  type UriPage,
  unwrapEntities,
} from "./resolver/connection.js";
