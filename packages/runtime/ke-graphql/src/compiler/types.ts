// =============================================================================
// @canonical/ke-graphql — Compiler type contracts
//
// The intermediate representations of the seven-pass pipeline specified in
// the A.10.COMPILER ADR. Everything before the IR is extraction; everything
// after it is emission. These types are a public contract (Prisma-DMMF
// style): consumers can inspect RawExtraction, OntologyIR, and MappedIR.
// =============================================================================

import type { Store } from "@canonical/ke";
import type DataLoader from "dataloader";
import type { GraphQLFieldConfig, GraphQLSchema } from "graphql";

// ---------------------------------------------------------------------------
// Diagnostics
//
// The compiler never aborts on the first error. Every pass returns its output
// plus diagnostics; codes are stable and append-only (X001 is retired and
// never reused).
// ---------------------------------------------------------------------------

export type DiagnosticSeverity = "error" | "warning" | "info";

export type DiagnosticCode =
  // Extraction
  | "E001" // SPARQL query failed
  // Build
  | "B001" // class cycle in subClassOf chain
  | "B002" // property references unknown class in domain
  | "B003" // property references unknown class/datatype in range
  | "B004" // inverse property references unknown property
  // Validation
  | "V001" // blank-node-only class (embeddable)
  | "V002" // property has no rdfs:domain (domainless)
  | "V003" // asymmetric owl:inverseOf
  | "V004" // self-referential relationship in ABox
  | "V005" // functional property with multiple values in ABox
  | "V006" // boolean-as-string mismatch
  | "V007" // annotation property filtered from ABox schema
  | "V008" // custom datatype mapped to base XSD type
  | "V009" // cross-vocabulary subClassOf
  | "V010" // SHACL sh:maxCount 0 — field omitted for a class
  | "V011" // SHACL sh:or — most permissive interpretation applied
  | "V012" // SHACL sh:in enum constraint — mapped to String
  | "V013" // property declares multiple rdfs:domain classes
  | "V014" // ABox predicate not declared in any loaded TBox
  // Mapping
  | "M001" // name collision after GraphQL name mapping
  | "M002" // reserved GraphQL name conflict
  | "M003" // custom mapping references unknown property/class
  | "M004" // type name collision auto-resolved by namespace prefixing
  // Emission
  | "X002" // union type created for polymorphic range
  | "X003" // union type synthesized from anonymous range
  // Composition
  | "C001" // extension references unknown type
  | "C002" // extension field conflicts with generated field
  | "C003"; // schema validation failed

export interface Diagnostic {
  severity: DiagnosticSeverity;
  code: DiagnosticCode;
  message: string;
  /** OWL URI that caused the diagnostic, when attributable. */
  source?: string;
  /** Compiler pass that emitted it. */
  phase: string;
}

export interface PassResult<T> {
  output: T;
  diagnostics: Diagnostic[];
}

// ---------------------------------------------------------------------------
// Pass 1 output — RawExtraction
//
// Direct output of the twelve SPARQL queries. Includes the ABox probes
// (instance stats, self-references, functional violations, undeclared
// predicates) so that Passes 2–7 never touch the store.
// ---------------------------------------------------------------------------

export interface RawClass {
  uri: string;
  label?: string;
  definition?: string;
  /** Direct rdfs:subClassOf URIs (blank-node superclasses are filtered). */
  superclasses: string[];
}

export type RawPropertyKind = "object" | "datatype" | "annotation";

export interface RawProperty {
  uri: string;
  label?: string;
  definition?: string;
  kind: RawPropertyKind;
  /** rdfs:domain URIs (0 or more). */
  domains: string[];
  /** rdfs:range URIs (0 or more, usually 1). */
  ranges: string[];
}

export interface RawInverse {
  property: string;
  inverse: string;
}

export interface RawDatatype {
  uri: string;
  /** The xsd: type it restricts (owl:onDatatype). */
  baseType?: string;
  /** xsd:pattern restriction value, when present. */
  pattern?: string;
}

export interface RawShaclConstraint {
  targetClass: string;
  property: string;
  minCount?: number;
  maxCount?: number;
  /** True when the constraint came from an sh:or branch (V011). */
  fromOr?: boolean;
  /** sh:in values, when present (V012). */
  inValues?: string[];
}

export interface RawUnion {
  /** URI if named union class; undefined if anonymous range. */
  uri?: string;
  /** Property URI if anonymous range; undefined if named class. */
  property?: string;
  members: string[];
}

export interface InstanceStats {
  total: number;
  named: number;
}

export interface RawExtraction {
  classes: RawClass[];
  properties: RawProperty[];
  inverses: RawInverse[];
  functionals: Set<string>;
  datatypes: RawDatatype[];
  /** namespace URI → prefix. */
  namespaces: Map<string, string>;
  shaclConstraints: RawShaclConstraint[];
  unions: RawUnion[];

  // ── ABox probes (keep later passes pure) ──
  /** Per class URI: instance counts (total, named i.e. non-blank). */
  instanceStats: Map<string, InstanceStats>;
  /** Properties with at least one self-referential assertion (V004). */
  selfReferential: Set<string>;
  /** Functional properties with >1 value on some instance (V005). */
  functionalViolations: Set<string>;
  /** ABox predicates not declared in any loaded TBox (V014). */
  undeclaredPredicates: Set<string>;
  /**
   * Annotation-property assertions: target URI -> (annotation property URI
   * -> value). Extracted here so the TBox schema never touches the store
   * (acceptanceCriteria/completionGuidance live on PropertyNode).
   */
  annotations: Map<string, Map<string, string>>;
  /** True when some blank node's object is itself a blank node (§5.3 depth guard). */
  deepBlankNesting: boolean;
}

// ---------------------------------------------------------------------------
// Pass 2 output — OntologyIR
// ---------------------------------------------------------------------------

export interface NamespaceInfo {
  prefix: string;
  uri: string;
  classCount: number;
  propertyCount: number;
}

export interface ClassNode {
  uri: string;
  label: string;
  definition?: string;
  /** Namespace prefix ('ds', 'cs', 'anatomy', …). */
  namespace: string;
  /** Direct parent classes (rdfs:subClassOf). */
  superclasses: readonly string[];
  /** Transitive superclass closure, most specific first. */
  ancestors: readonly string[];
  /** Direct subclasses. */
  subclasses: readonly string[];
  /** No direct instances + has subclasses (or custom override). */
  isAbstract: boolean;
  /**
   * Instances are exclusively blank nodes (from Pass 1 instanceStats) or
   * forced via custom mapping (KG.13). Embeddable types implement no Node
   * interface and have no id/uri/_meta or root queries.
   */
  embeddable: boolean;
  /** Properties whose rdfs:domain is this class. */
  ownProperties: readonly string[];
  /** Own + inherited properties, own first. */
  allProperties: readonly string[];
}

export interface CardinalitySpec {
  singular: boolean;
  required: boolean;
  omit: boolean;
  source: "owl:FunctionalProperty" | "owl:cardinality" | "shacl" | "custom";
}

export type PropertyKind = RawPropertyKind;

export interface ScalarRange {
  kind: "scalar";
  xsd: string;
  graphqlScalar: "String" | "Boolean" | "Int" | "Float";
  customDatatype?: string;
}

export interface ClassRange {
  kind: "class";
  uri: string;
}

export interface UnionRange {
  kind: "union";
  name?: string;
  members: readonly string[];
}

export interface UnknownRange {
  kind: "unknown";
  raw: string;
}

export type RangeSpec = ScalarRange | ClassRange | UnionRange | UnknownRange;

export interface PropertyNode {
  uri: string;
  label: string;
  definition?: string;
  namespace: string;
  kind: PropertyKind;
  domains: readonly string[];
  range: RangeSpec;
  /** Default cardinality (KG.17 precedence chain). True = singular. */
  functional: boolean;
  /** Per-class cardinality overrides (SHACL). Key: class URI. */
  classCardinality: ReadonlyMap<string, CardinalitySpec>;
  /** Inverse property URI when declared via owl:inverseOf. */
  inverse?: string;
  isAnnotation: boolean;
  /** Annotation values targeting THIS property (annotation prop URI -> value). */
  annotations: ReadonlyMap<string, string>;
}

export interface OntologyIR {
  classes: ReadonlyMap<string, ClassNode>;
  properties: ReadonlyMap<string, PropertyNode>;
  namespaces: ReadonlyMap<string, NamespaceInfo>;
  /** Carried through from Pass 1 for the validate/map passes. */
  extraction: RawExtraction;
}

// ---------------------------------------------------------------------------
// Pass 4 output — MappedIR
// ---------------------------------------------------------------------------

export type ResolverTemplate =
  | "datatype"
  | "datatype-list"
  | "object-singular"
  | "object-list"
  | "embedded-singular"
  | "embedded-list"
  | "inverse"
  | "meta";

export type FieldTypeSpec =
  | { kind: "scalar"; name: string }
  | { kind: "type"; name: string }
  | { kind: "union"; name: string; members: readonly string[] };

export interface MappedField {
  owlUri: string;
  graphqlName: string;
  type: FieldTypeSpec;
  nullable: boolean;
  list: boolean;
  resolverTemplate: ResolverTemplate;
  propertyUri: string;
  /** For inverse fields: the forward property whose assertions are reversed. */
  inverseOf?: string;
  /** SHACL sh:minCount >= 1 — informational, not auto-promoted (KG.15). */
  shaclRequired: boolean;
  /** Consumer-promoted via NonNullOverrides (KG.15 Tier 3). */
  nonNull: boolean;
}

export interface MappedType {
  owlUri: string;
  graphqlName: string;
  /** GraphQL interface names this type implements (ancestors). */
  interfaces: readonly string[];
  fields: ReadonlyMap<string, MappedField>;
  embeddable: boolean;
  namespace: string;
  /** Pluralized root listing field name (e.g. "categories"). */
  pluralName: string;
  /** Singular root lookup field name (e.g. "category"). */
  singularName: string;
}

export interface MappedInterface {
  owlUri: string;
  graphqlName: string;
  parentInterfaces: readonly string[];
  fields: ReadonlyMap<string, MappedField>;
}

export interface NameMap {
  /** OWL URI → GraphQL name. */
  toGraphQL(uri: string): string | undefined;
  /** GraphQL name → OWL URI. Field names are scoped per type: "Type.field". */
  toOWL(name: string): string | undefined;
  entries(): Iterable<[string, string]>;
}

export interface MappedUnion {
  name: string;
  /** Concrete member type names (abstract members already expanded). */
  members: readonly string[];
}

export interface MappedIR {
  types: ReadonlyMap<string, MappedType>;
  interfaces: ReadonlyMap<string, MappedInterface>;
  unions: ReadonlyMap<string, MappedUnion>;
  nameMap: NameMap;
  namespaces: ReadonlyMap<string, NamespaceInfo>;
  /** The OntologyIR, carried for resolver closures (meta fields, tbox). */
  ir: OntologyIR;
}

// ---------------------------------------------------------------------------
// Resolver runtime values
// ---------------------------------------------------------------------------

/** A predicate URI → object values map for one entity. */
export type TripleSet = Map<string, TripleValue[]>;

export type TripleValue =
  | { kind: "uri"; value: string }
  | { kind: "literal"; value: string; datatype?: string; language?: string }
  | { kind: "blank"; id: string; triples: TripleSet };

/**
 * The uniform parent value flowing through every resolver. Named entities
 * carry their prefixed URI; embedded blank-node values carry uri: null.
 */
export interface EntityValue {
  uri: string | null;
  typename: string;
  triples: TripleSet;
}

export interface InverseKey {
  /** The forward OWL property URI whose assertions are reversed. */
  property: string;
  /** The entity (full IRI) being pointed at. */
  object: string;
}

export interface CompilerContext {
  entityLoader: DataLoader<string, EntityValue | null>;
  listLoader: DataLoader<string, string[]>;
  inverseLoader: DataLoader<string, string[]>;
  nameMap: NameMap;
  /**
   * The ke store (escape hatch for extensions). May be a Promise for
   * lazy-store boots: ABox loaders await it; TBox resolvers never touch it.
   */
  store: Store | Promise<Store>;
  /** Resolver-time warning channel (EC.03 coercion failures). */
  warn: RuntimeWarningHandler;
  /** Extension state (search index, back-link index, …) — consumer-owned. */
  [key: string]: unknown;
}

export type RuntimeWarningHandler = (warning: {
  property: string;
  value: string;
  reason: string;
}) => void;

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface CustomMapping {
  graphqlName?: string;
  singular?: boolean;
  abstract?: boolean;
  embeddable?: boolean;
  /** Synthesize an inverse field on the property's range type (KG.02). */
  inverse?: { graphqlName: string };
}

export type CustomMappings = Record<string, CustomMapping>;

export type NonNullOverrides = Record<string, string[]>;

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

export interface SchemaPluginOptions {
  mappings?: CustomMappings;
  extensions?: SchemaExtensionsInput;
  /** Wire the Node interface, global IDs, and connections. Default: true. */
  relay?: boolean;
  /** Add @defer/@stream directives to the schema (KG.21). Default: false. */
  incremental?: boolean;
  /** File path for SDL output. */
  sdlOutput?: string;
  nonNullOverrides?: NonNullOverrides;
  /**
   * Opt-in instance-level standard-vocabulary fields (EC.15).
   * Per GraphQL type name: predicate URI → field name.
   */
  standardVocabFields?: Record<string, Record<string, string>>;
  /** Resolver-time warnings (coercion failures). Default: console.warn, deduplicated. */
  onRuntimeWarning?: RuntimeWarningHandler;
  /**
   * DataLoader cache scope. "request" (default): fresh caches per
   * createContext call. "process": caches shared across contexts for the
   * lifetime of this CompilerResult — sound because the store is immutable
   * between reloads, and onReload produces a new result (auto-invalidation).
   * Failed batches are evicted, never memoized.
   */
  loaderCache?: "request" | "process";
}

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
 * The query surface the compiler needs. Satisfied by both ke's
 * PluginContext.query (compile time) and Store.query (request time).
 */
export type QueryFn = (
  query: string,
) => Promise<import("@canonical/ke").QueryResult>;
