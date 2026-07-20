import type { Edge, Node } from "@xyflow/react";
import type { HierarchyWell_ontologies$key } from "#relay/__generated__/HierarchyWell_ontologies.graphql.js";

/** One class node's payload: the prefixed term (the route address), its
 * display label, and abstractness (styling only — the label is complete). */
export interface TermNodeData extends Record<string, unknown> {
  readonly term: string;
  readonly label: string;
  readonly isAbstract: boolean;
}

/** The well's node/edge shapes (React Flow's, narrowed to this graph). */
export type TermFlowNode = Node<TermNodeData, "term">;
export type TermFlowEdge = Edge;

export interface HierarchyWellProps {
  /** Additional CSS class names. */
  className?: string;
  /** Plural fragment ref over the query root's `ontologies` list. */
  readonly ontologies: HierarchyWell_ontologies$key;
  /** The selected term (prefixed URI), or undefined on `/definitions`. */
  readonly term: string | undefined;
}
