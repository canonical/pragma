import type { Node, NodeProps } from "@xyflow/react";
import type { GraphEntity } from "../../graph/types.js";

/**
 * Data an entity node carries on the canvas. Declared as a `type` (not an
 * `interface`) so it satisfies React Flow's `Record<string, unknown>` data
 * constraint through TypeScript's implicit index signature for object-literal
 * type aliases.
 */
export type EntityNodeData = { entity: GraphEntity };

/** The typed React Flow node the `EntityNode` renderer draws. */
export type EntityFlowNode = Node<EntityNodeData, "entity">;

/** Props React Flow passes to the `EntityNode` renderer. */
export type EntityNodeProps = NodeProps<EntityFlowNode>;
