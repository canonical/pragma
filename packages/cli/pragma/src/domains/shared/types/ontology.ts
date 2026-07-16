/** Ontology inspection return types. */

/** Summary of a loaded ontology namespace from `ontology list`. */
export interface OntologySummary {
  /** Short prefix alias (e.g., `"ds"`, `"cs"`). */
  readonly prefix: string;
  /** Full namespace URI the prefix expands to. */
  readonly namespace: string;
  /** Number of OWL/RDFS classes defined in this namespace. */
  readonly classCount: number;
  /** Number of properties (object + datatype) defined in this namespace. */
  readonly propertyCount: number;
  readonly anatomyCount: number;
}

/**
 * A property in an ontology namespace.
 *
 * All IRIs are compact (`ds:tier`); the owning {@link OntologyDetailed}
 * carries the `prefixes` map needed to expand them.
 */
export interface OntologyProperty {
  /** Compact IRI of the property. */
  readonly iri: string;
  /** Human-readable label (rdfs:label, falling back to the local name). */
  readonly label: string;
  /** Whether this is an object property (links classes) or datatype property (links to literals). */
  readonly kind: "object" | "datatype";
  /** Compact IRI of the domain class this property applies to, if declared. */
  readonly domain?: string;
  /** Compact IRI of the range class or datatype, if declared. */
  readonly range?: string;
  /** Present (true) when the property is an owl:FunctionalProperty. */
  readonly functional?: true;
}

/**
 * A class in an ontology's class hierarchy.
 *
 * Classes arrive in deterministic topological order (roots first,
 * alphabetical among siblings) with their direct properties attached.
 */
export interface OntologyClass {
  /** Compact IRI of the class. */
  readonly iri: string;
  /** Human-readable label (rdfs:label, falling back to the local name). */
  readonly label: string;
  /** Class documentation (rdfs:comment), omitted when absent. */
  readonly comment?: string;
  /** Compact IRIs of all direct superclasses (empty for roots). */
  readonly subClassOf: readonly string[];
  /** Number of instances typed with this class, omitted when zero. */
  readonly instances?: number;
  /** Properties whose rdfs:domain is this class. */
  readonly properties: readonly OntologyProperty[];
}

/** Summary of a SHACL node shape constraining a class. */
export interface OntologyConstraint {
  /** Compact IRI of the sh:NodeShape. */
  readonly shape: string;
  /** Compact IRI of the sh:targetClass, if declared. */
  readonly targetClass?: string;
  /** Number of sh:property constraints on the shape. */
  readonly propertyCount: number;
}

/** owl:Ontology header metadata, when the namespace declares one. */
export interface OntologyMeta {
  /** rdfs:label / dcterms:title of the ontology node. */
  readonly title?: string;
  /** owl:versionInfo. */
  readonly version?: string;
  /** Compact IRIs of owl:imports. */
  readonly imports?: readonly string[];
}

/** Deep-dive view of one class, produced by `ontology show <ns> --class <C>`. */
export interface OntologyClassFocus {
  /** Compact IRI of the focused class. */
  readonly iri: string;
  readonly label: string;
  readonly comment?: string;
  /** Superclass chain within the namespace, nearest first. */
  readonly superChain: readonly string[];
  /** Compact IRIs of direct subclasses. */
  readonly subclasses: readonly string[];
  /** Number of instances typed with this class. */
  readonly instances: number;
  /** Properties declared directly on this class. */
  readonly directProperties: readonly OntologyProperty[];
  /** Properties inherited from the super chain. */
  readonly inheritedProperties: readonly OntologyProperty[];
  /** Properties elsewhere in the namespace whose range is this class. */
  readonly referencedBy: readonly OntologyProperty[];
  /** Up to a few instance IRIs, as entry points for `graph inspect` / lookups. */
  readonly sampleInstances: readonly string[];
}

/**
 * Detailed view of a single ontology namespace from `ontology show`.
 *
 * This is the single complete structure every output mode projects:
 * plain, `--llm`, `--format json`, and the MCP `ontology_show` envelope
 * all render from this shape and nothing else.
 */
export interface OntologyDetailed {
  /** Short prefix alias (e.g., `"ds"`). */
  readonly prefix: string;
  /** Full namespace URI the prefix expands to. */
  readonly namespace: string;
  /** Prefix map covering every compact IRI used in this structure. */
  readonly prefixes: Readonly<Record<string, string>>;
  /** owl:Ontology header metadata, omitted when the namespace declares none. */
  readonly meta?: OntologyMeta;
  /** All classes, topologically ordered, with direct properties attached. */
  readonly classes: readonly OntologyClass[];
  /** Properties with no domain, or a domain outside this namespace's classes. */
  readonly unattached: readonly OntologyProperty[];
  /** SHACL node-shape summaries, omitted when none exist. */
  readonly constraints?: readonly OntologyConstraint[];
  /** Per-class deep dive, present when a class filter was requested. */
  readonly focus?: OntologyClassFocus;
}
