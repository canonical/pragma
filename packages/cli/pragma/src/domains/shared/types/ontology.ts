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

/** A class in an ontology's class hierarchy. */
export interface OntologyClass {
  /** Full URI of the class. */
  readonly uri: string;
  /** Human-readable label (rdfs:label). */
  readonly label: string;
  /** URI of the direct superclass, if declared. */
  readonly superclass?: string;
}

/** A property in an ontology namespace. */
export interface OntologyProperty {
  /** Full URI of the property. */
  readonly uri: string;
  /** Human-readable label (rdfs:label). */
  readonly label: string;
  /** URI of the domain class this property applies to, if declared. */
  readonly domain?: string;
  /** URI of the range class or datatype, if declared. */
  readonly range?: string;
  /** Whether this is an object property (links classes) or datatype property (links to literals). */
  readonly type: "object" | "datatype";
}

/** Detailed view of a single ontology namespace from `ontology show`. */
export interface OntologyDetailed {
  /** Short prefix alias (e.g., `"ds"`). */
  readonly prefix: string;
  /** Full namespace URI the prefix expands to. */
  readonly namespace: string;
  /** All classes defined in this namespace. */
  readonly classes: readonly OntologyClass[];
  /** All properties defined in this namespace. */
  readonly properties: readonly OntologyProperty[];
}
