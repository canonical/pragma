import type { Edge, EdgeProps } from "@xyflow/react";
import type { GraphRelation } from "../../graph/types.js";

/**
 * Data every graph edge carries. Shared by both edge renderers — `RelationEdge`
 * (associative relations) and `SubclassEdge` (the taxonomic "is a") — since they
 * differ only in how they are drawn, not in what they represent. Declared as a
 * `type` so it satisfies React Flow's `Record<string, unknown>` data constraint.
 */
export type RelationEdgeData = {
  relation: GraphRelation;
  /** Appearance modifier class, e.g. `"uses"`, from `resolveRelationAppearance`. */
  modifier: string;
};

/** The typed React Flow edge produced by `buildGraphElements`. */
export type RelationFlowEdge = Edge<RelationEdgeData, "relation" | "subclass">;

/** Props React Flow passes to the `RelationEdge` renderer. */
export type RelationEdgeProps = EdgeProps<RelationFlowEdge>;
