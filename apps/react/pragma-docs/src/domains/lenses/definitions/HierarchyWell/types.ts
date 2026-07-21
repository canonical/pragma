import type { Edge, Node } from "@xyflow/react";
import type { HierarchyWell_ontologies$key } from "#relay/__generated__/HierarchyWell_ontologies.graphql.js";
import type { LensFilter } from "../lensFilter.js";

/**
 * One class node's payload: the prefixed term (the route address), its
 * display label, and the two REAL per-class facets the graph carries —
 * abstractness and the owning ontology's prefix. Both drive presentation
 * (the node's typographic marking) and the chip axes; neither is invented.
 */
export interface TermNodeData extends Record<string, unknown> {
  readonly term: string;
  readonly label: string;
  readonly isAbstract: boolean;
  /** The owning ontology's compact prefix (`ds`, `cs`, `anatomy`). */
  readonly prefix: string;
}

/** The well's node/edge shapes (React Flow's, narrowed to this graph). */
export type TermFlowNode = Node<TermNodeData, "term">;
export type TermFlowEdge = Edge;

export interface HierarchyWellProps {
  /** Additional CSS class names. */
  className?: string;
  /**
   * The lens's ephemeral filter. The well HIDES on it (the asymmetry: the
   * rail only dims), and an edge survives only when both its endpoints do.
   */
  readonly filter: LensFilter;
  /** Plural fragment ref over the query root's `ontologies` list. */
  readonly ontologies: HierarchyWell_ontologies$key;
  /** The selected term (prefixed URI), or undefined on `/definitions`. */
  readonly term: string | undefined;
  /**
   * The SHARED transient ego centre — hover or keyboard focus on EITHER
   * surface, lifted into `DefinitionsExplorer` so the rail and the well
   * agree on one focus (P-D7). The well fades to this centre's 1-hop
   * neighbourhood. CLIENT-ONLY: `undefined` on the server and the first
   * client paint, so the well's boot markup is the selection-only fade,
   * byte-identical to the server's (see `decorateGraph.ts`).
   */
  readonly hoverCentre: string | undefined;
  /**
   * Raise (or clear) the shared ego centre from a graph interaction —
   * pointer-enter/leave on a node, and keyboard focus/blur within the flow.
   * The rail reads the same centre and marks the matching item, so a graph
   * hover lights up the index and a rail hover fades the graph.
   */
  readonly onHoverTerm: (term: string | undefined) => void;
}
