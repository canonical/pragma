import type { EdgeProps } from "@xyflow/react";
import type { RelationFlowEdge } from "../RelationEdge/types.js";

/**
 * Props React Flow passes to the `SubclassEdge` renderer. It draws the same
 * `RelationFlowEdge` data as `RelationEdge`; only the visual treatment differs,
 * so the edge data type is shared rather than duplicated.
 */
export type SubclassEdgeProps = EdgeProps<RelationFlowEdge>;
