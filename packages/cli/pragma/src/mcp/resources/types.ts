/**
 * Shared types for the MCP resource surface.
 *
 * These shapes flow from the bulk graph index (`buildGraphIndex`) through
 * listing (`buildResourceList`), autocomplete (`rankUriCompletions`), and
 * entity reads (`readEntity`). They live together because each stage
 * consumes the previous stage's output — the box/category vocabulary is the
 * spine that keeps TBox schema and ABox individuals distinguishable end to end.
 */

/** Whether an entity is schema (TBox) or an individual (ABox). */
export type EntityBox = "tbox" | "abox";

/** Fine-grained entity kind within its box. */
export type EntityCategory = "class" | "property" | "individual";

/** A literal object value in an entity read. */
export interface PropertyValueLiteral {
  readonly type: "literal";
  readonly value: string;
}

/** A URI object value in an entity read, resolved to a summary. */
export interface PropertyValueUri {
  readonly type: "uri";
  readonly uri: string;
  readonly prefixed: string;
  readonly label: string | null;
}

/** A blank-node object value in an entity read. */
export interface PropertyValueBlank {
  readonly type: "bnode";
  readonly id: string;
}

/** One object value of a predicate in an entity read. */
export type PropertyValue =
  | PropertyValueLiteral
  | PropertyValueUri
  | PropertyValueBlank;

/** All object values asserted for a single predicate. */
export interface PropertyGroup {
  readonly predicate: string;
  readonly values: PropertyValue[];
}

/** One classified subject in the graph index. */
export interface GraphEntity {
  readonly uri: string;
  readonly prefixed: string;
  readonly box: EntityBox;
  readonly category: EntityCategory;
  /** Compacted `rdf:type` values. */
  readonly types: string[];
  /** Compacted primary type used for grouping and naming (individuals). */
  readonly primaryType: string | null;
  /** Compacted primary type label, or the type's local name. */
  readonly primaryTypeLabel: string | null;
  readonly label: string | null;
  readonly description: string | null;
}

/** The in-memory index of all named-node subjects, built via bulk queries. */
export interface GraphIndex {
  readonly entities: GraphEntity[];
  /** Full URI → resolved label, for cheap type-label and object-label joins. */
  readonly labelByUri: ReadonlyMap<string, string>;
  /** Full URI → count of subjects declaring it as an `rdf:type`. */
  readonly instanceCountByType: ReadonlyMap<string, number>;
}

/** MCP resource annotations we emit (schema-valid subset). */
export interface ResourceAnnotations {
  readonly audience: ("assistant" | "user")[];
  readonly priority: number;
}

/** A single resource entry returned from the `list` callback. */
export interface ListedResource {
  readonly uri: string;
  readonly name: string;
  readonly description?: string;
  readonly mimeType: "application/json";
  readonly annotations: ResourceAnnotations;
  readonly _meta: Record<string, unknown>;
}

/** How many individuals a listing dropped, per capped class. */
export interface ListingTruncation {
  readonly totalDropped: number;
  readonly droppedByType: ReadonlyMap<string, number>;
}

/** Result of building a resource listing from the graph index. */
export interface ResourceListing {
  readonly resources: ListedResource[];
  readonly truncation: ListingTruncation;
}

/** A candidate for URI autocomplete: its compacted form and human label. */
export interface UriCompletionCandidate {
  readonly prefixed: string;
  readonly label: string | null;
}

/** A read entity payload, shaped by its box. */
export interface ResourceEntity {
  readonly uri: string;
  readonly prefixed: string;
  readonly box: EntityBox;
  readonly category: EntityCategory;
  readonly types: string[];
  readonly label: string | null;
  readonly description: string | null;
  readonly properties: PropertyGroup[];
  /** Class read: compacted superclasses. */
  readonly superClasses?: string[];
  /** Class read: compacted direct subclasses. */
  readonly subClasses?: string[];
  /** Class read: number of asserted individuals. */
  readonly instanceCount?: number;
  /** Class read: compacted properties declaring this class as their domain. */
  readonly declaredProperties?: string[];
  /** Individual read: compacted primary class this individual belongs to. */
  readonly instanceOf?: string | null;
}
