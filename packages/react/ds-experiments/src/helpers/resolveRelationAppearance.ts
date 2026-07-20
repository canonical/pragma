import type { RelationKind } from "../graph/types.js";

/** Which registered React Flow edge renderer draws a relation. */
export type EdgeRenderer = "subclass" | "relation";

/**
 * The visual encoding of one relation kind — shared by `buildGraphElements`
 * (which picks the edge renderer and label) and `GraphLegend` (which explains
 * it). `edgeRenderer` splits the ontology's two edge archetypes: the taxonomic
 * `SUBCLASS_OF` ("is a") is drawn by `SubclassEdge` with a hollow arrowhead,
 * while associative relations are drawn by `RelationEdge`.
 */
export interface RelationAppearance {
  /** Modifier class appended to the edge, e.g. `"uses"`. */
  readonly modifier: string;
  /** The verb rendered on the edge when it carries no explicit label. */
  readonly label: string;
  /** The registered edge component that draws this relation. */
  readonly edgeRenderer: EdgeRenderer;
  /** CSS custom property (design token) that colours this relation. */
  readonly accentVar: string;
}

const APPEARANCE_BY_KIND: Record<RelationKind, RelationAppearance> = {
  SUBCLASS_OF: {
    modifier: "subclass",
    label: "is a",
    edgeRenderer: "subclass",
    accentVar: "--relation-accent-subclass",
  },
  USES: {
    modifier: "uses",
    label: "uses",
    edgeRenderer: "relation",
    accentVar: "--relation-accent-uses",
  },
  GOVERNS: {
    modifier: "governs",
    label: "governs",
    edgeRenderer: "relation",
    accentVar: "--relation-accent-governs",
  },
  REFINES: {
    modifier: "refines",
    label: "refines",
    edgeRenderer: "relation",
    accentVar: "--relation-accent-refines",
  },
};

const FALLBACK_APPEARANCE: RelationAppearance = {
  modifier: "unknown",
  label: "relates to",
  edgeRenderer: "relation",
  accentVar: "--relation-accent-unknown",
};

/**
 * Resolves the visual encoding for a relation kind, degrading unknown kinds
 * (e.g. GraphQL's `"%future added value"`) to a neutral associative edge rather
 * than failing the render.
 */
const resolveRelationAppearance = (kind: string): RelationAppearance =>
  APPEARANCE_BY_KIND[kind as RelationKind] ?? FALLBACK_APPEARANCE;

export default resolveRelationAppearance;
