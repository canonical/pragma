/**
 * @canonical/react-ds-experiments — a playground for advanced, graph-shaped
 * design-system components, developed in isolation from the shipped tiers.
 *
 * The public surface is the *pure* graph layer: presentational components that
 * render a plain slice of the knowledge graph, plus the helpers that lay it out
 * and colour it. The Relay *projection* (`OntologyGraph`) and its mock schema
 * are demonstrated in Storybook rather than exported, because they depend on a
 * compiler pass — see the package README.
 *
 * @packageDocumentation
 */

// Domain vocabulary
export type * from "./graph/types.js";
// Helpers
export * from "./helpers/index.js";
export type {
  EntityFlowNode,
  EntityNodeData,
  EntityNodeProps,
} from "./lib/EntityNode/index.js";
export { EntityNode } from "./lib/EntityNode/index.js";
export type { GraphCanvasProps } from "./lib/GraphCanvas/index.js";
// Components
export { GraphCanvas } from "./lib/GraphCanvas/index.js";
export type { GraphLegendProps } from "./lib/GraphLegend/index.js";
export { GraphLegend } from "./lib/GraphLegend/index.js";
export type {
  RelationEdgeData,
  RelationEdgeProps,
  RelationFlowEdge,
} from "./lib/RelationEdge/index.js";
export { RelationEdge } from "./lib/RelationEdge/index.js";
export type { SubclassEdgeProps } from "./lib/SubclassEdge/index.js";
export { SubclassEdge } from "./lib/SubclassEdge/index.js";
