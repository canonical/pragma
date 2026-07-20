import type {
  GraphEntity,
  GraphPosition,
  GraphRelation,
} from "../graph/types.js";
import type { EntityFlowNode } from "../lib/EntityNode/types.js";
import type { RelationFlowEdge } from "../lib/RelationEdge/types.js";
import computeGraphLayout, {
  type GraphLayoutOptions,
} from "./computeGraphLayout.js";
import resolveRelationAppearance from "./resolveRelationAppearance.js";

/** Options for {@link buildGraphElements}. */
export interface BuildGraphElementsOptions {
  /**
   * Curated positions keyed by entity id. Any entity absent from the map is
   * placed by {@link computeGraphLayout}, so partial curation is fine.
   */
  readonly positions?: Map<string, GraphPosition>;
  /** Forwarded to {@link computeGraphLayout} for entities without a position. */
  readonly layout?: GraphLayoutOptions;
}

/** The React Flow `nodes` and `edges` a `GraphCanvas` renders. */
export interface GraphElements {
  readonly nodes: EntityFlowNode[];
  readonly edges: RelationFlowEdge[];
}

/**
 * Converts a pure graph slice — plain entities and relations — into the typed
 * node and edge arrays React Flow consumes. This is the single adapter between
 * the domain vocabulary and the rendering library: entities become `entity`
 * nodes carrying their data, and each relation becomes an edge whose renderer
 * (`subclass` vs `relation`) and default label come from
 * {@link resolveRelationAppearance}.
 *
 * Positioning is resolved here so both the node array and any caller share one
 * coordinate system: curated `positions` win, and everything else falls back to
 * the deterministic layered layout.
 */
const buildGraphElements = (
  entities: readonly GraphEntity[],
  relations: readonly GraphRelation[],
  options: BuildGraphElementsOptions = {},
): GraphElements => {
  const computed = computeGraphLayout(entities, options.layout);
  const positionOf = (id: string): GraphPosition =>
    options.positions?.get(id) ?? computed.get(id) ?? { x: 0, y: 0 };

  const nodes: EntityFlowNode[] = entities.map((entity) => ({
    id: entity.id,
    type: "entity",
    position: positionOf(entity.id),
    data: { entity },
  }));

  const edges: RelationFlowEdge[] = relations.map((relation) => {
    const appearance = resolveRelationAppearance(relation.kind);
    return {
      id: relation.id,
      source: relation.source,
      target: relation.target,
      type: appearance.edgeRenderer,
      // The verb is shown on the edge; an explicit relation label overrides it.
      label: relation.label ?? appearance.label,
      data: { relation, modifier: appearance.modifier },
    };
  });

  return { nodes, edges };
};

export default buildGraphElements;
