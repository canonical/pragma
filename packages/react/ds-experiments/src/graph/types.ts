/**
 * Domain vocabulary for the ontology-graph components.
 *
 * These are the *pure* data shapes the graph components render — a plain,
 * framework-agnostic projection of a slice of the Pragma knowledge graph. They
 * intentionally mirror the GraphQL schema in `../relay/schema.graphql`, so the
 * Relay projection (`OntologyGraph`) can hand its query result straight to the
 * pure `GraphCanvas` with only a narrowing cast. Nothing here imports React,
 * Relay, or React Flow — the presentational layer depends on this file, never
 * the other way round.
 */

/** The ontology category an entity belongs to. */
export type EntityKind = "COMPONENT" | "TOKEN" | "STANDARD" | "CONCEPT";

/** The design-system tier an entity is sourced from. */
export type EntityTier = "GLOBAL" | "DOCS" | "APPLICATION" | "SCDN";

/** The kind of a typed relation between two entities. */
export type RelationKind = "SUBCLASS_OF" | "USES" | "GOVERNS" | "REFINES";

/** A single entity — a node in the knowledge graph. */
export interface GraphEntity {
  /** Opaque, stable global identifier. */
  id: string;
  /** Human-readable label, e.g. `"Button"`. */
  label: string;
  /** The ontology category this entity belongs to. */
  kind: EntityKind;
  /** The design-system tier this entity is sourced from, when known. */
  tier?: EntityTier | null;
  /** A one-line description of the entity. */
  summary?: string | null;
}

/** A directed, typed relation — an edge in the knowledge graph. */
export interface GraphRelation {
  /** Opaque, stable identifier for the relation itself. */
  id: string;
  /** `id` of the entity the relation starts from. */
  source: string;
  /** `id` of the entity the relation points to. */
  target: string;
  /** The kind of relation. */
  kind: RelationKind;
  /** An optional label rendered on the edge; falls back to the kind's verb. */
  label?: string | null;
}

/** A 2-D position on the canvas, in the coordinate space React Flow uses. */
export interface GraphPosition {
  x: number;
  y: number;
}

/** A slice of the knowledge graph: its entities and the relations among them. */
export interface SchemaGraph {
  entities: GraphEntity[];
  relations: GraphRelation[];
}
