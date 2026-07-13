import type { EntityKind } from "../graph/types.js";

/**
 * The visual encoding of one ontology category — the single source of truth
 * shared by `EntityNode` (how a node is drawn) and `GraphLegend` (how the
 * encoding is explained). Keeping both consumers on the same resolver is what
 * guarantees the legend never drifts from the canvas.
 */
export interface EntityAppearance {
  /** Modifier class appended to the node, e.g. `"component"`. */
  readonly modifier: string;
  /** Human-readable name of the category, e.g. `"Component"`. */
  readonly label: string;
  /**
   * CSS custom property (design token) that colours this category. Defined in
   * `EntityNode`'s stylesheet and referenced by both the node and the legend
   * swatch, so a palette change is a one-line edit.
   */
  readonly accentVar: string;
}

const APPEARANCE_BY_KIND: Record<EntityKind, EntityAppearance> = {
  COMPONENT: {
    modifier: "component",
    label: "Component",
    accentVar: "--entity-accent-component",
  },
  TOKEN: {
    modifier: "token",
    label: "Token",
    accentVar: "--entity-accent-token",
  },
  STANDARD: {
    modifier: "standard",
    label: "Standard",
    accentVar: "--entity-accent-standard",
  },
  CONCEPT: {
    modifier: "concept",
    label: "Concept",
    accentVar: "--entity-accent-concept",
  },
};

const FALLBACK_APPEARANCE: EntityAppearance = {
  modifier: "unknown",
  label: "Entity",
  accentVar: "--entity-accent-unknown",
};

/**
 * Resolves the visual encoding for an entity category. Accepts a plain string
 * (not just the `EntityKind` union) so a value the graph has grown but this
 * package has not yet learned — GraphQL's `"%future added value"` — degrades to
 * a neutral appearance instead of crashing the render.
 */
const resolveEntityAppearance = (kind: string): EntityAppearance =>
  APPEARANCE_BY_KIND[kind as EntityKind] ?? FALLBACK_APPEARANCE;

export default resolveEntityAppearance;
