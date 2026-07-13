import { type ReactElement, useMemo } from "react";
import { graphql, useLazyLoadQuery } from "react-relay";
import type {
  EntityKind,
  EntityTier,
  GraphEntity,
  GraphRelation,
  RelationKind,
} from "../../graph/types.js";
import type { OntologyGraphQuery } from "../../relay/__generated__/OntologyGraphQuery.graphql.js";
import GraphCanvas from "../GraphCanvas/GraphCanvas.js";
import type { OntologyGraphProps } from "./types.js";

// The projection contract: the exact slice of the graph the canvas renders.
// `vite-plugin-relay-lite` rewrites this tag into an import of the committed
// artifact in `../../relay/__generated__`; regenerate with `bun run relay`.
const ontologyGraphQuery = graphql`
  query OntologyGraphQuery($focus: ID) {
    ontology(focus: $focus) {
      entities {
        id
        label
        kind
        tier
        summary
      }
      relations {
        id
        source
        target
        kind
        label
      }
    }
  }
`;

/**
 * The Relay *projection* of the ontology graph: it binds a GraphQL query and
 * hands the result to the pure `GraphCanvas`. This binding is the bi-modal
 * invariant from the A-workstream ADRs — the same query a human sees rendered
 * here is the one an agent would issue — so the projection, not the pixels, is
 * the contract.
 *
 * It suspends while the query is in flight, so render it inside a `Suspense`
 * boundary (and, in Storybook, under the `@canonical/storybook-addon-relay`
 * mock environment via `parameters.relay`).
 *
 * @implements ds:experiments.projection.ontology-graph
 */
const OntologyGraph = ({
  focus = null,
  height,
  showLegend,
  className,
}: OntologyGraphProps): ReactElement => {
  const data = useLazyLoadQuery<OntologyGraphQuery>(ontologyGraphQuery, {
    focus,
  });

  // Narrow the query result (readonly, with GraphQL's open enums) to the pure
  // domain shapes the canvas consumes. `resolve*Appearance` tolerates unknown
  // kinds, so the casts are safe even if the graph grows a value we predate.
  const entities: GraphEntity[] = useMemo(
    () =>
      data.ontology.entities.map((entity) => ({
        id: entity.id,
        label: entity.label,
        kind: entity.kind as EntityKind,
        tier: (entity.tier ?? null) as EntityTier | null,
        summary: entity.summary ?? null,
      })),
    [data],
  );

  const relations: GraphRelation[] = useMemo(
    () =>
      data.ontology.relations.map((relation) => ({
        id: relation.id,
        source: relation.source,
        target: relation.target,
        kind: relation.kind as RelationKind,
        label: relation.label ?? null,
      })),
    [data],
  );

  return (
    <GraphCanvas
      entities={entities}
      relations={relations}
      height={height}
      showLegend={showLegend}
      className={className}
    />
  );
};

export default OntologyGraph;
