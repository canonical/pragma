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

/**
 * The well's own node shape (React Flow retired — AV-364's well grammar):
 * a positioned box addressed by its CENTRE, in the canvas's 1:1 px space.
 * `id` is the prefixed term URI — the same string the term route
 * addresses, so selection and links need no translation. `className` is
 * the decorate pass's output (`decorateGraph.ts`), the only mutable-ish
 * field (rebuilt immutably, identity-preserved when unchanged).
 */
export interface TermFlowNode {
  readonly id: string;
  readonly data: TermNodeData;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly className?: string;
}

/**
 * The well's own edge shape. `source`/`target` are prefixed term URIs —
 * the fields the decorate pass's ego-neighbourhood walks. Structural
 * edges (subclass → superclass) run straight and unlabelled; semantic
 * edges (object properties, domain → range) arc and carry their predicate.
 */
export interface TermFlowEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly family: "structural" | "semantic";
  /** The predicate's display name; semantic edges only. */
  readonly predicate?: string;
  /** Ready-to-render SVG path, endpoints trimmed to the node boxes. */
  readonly d: string;
  /** Label anchor; semantic edges only. */
  readonly labelAt?: { readonly x: number; readonly y: number };
  readonly className?: string;
}

/** One ontology's settled cluster extent, for the caption watermark. */
export interface ClusterExtent {
  readonly prefix: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

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
   * pointer-enter/leave on a node, and keyboard focus/blur within the
   * well. The rail reads the same centre and marks the matching item, so a
   * graph hover lights up the index and a rail hover fades the graph.
   */
  readonly onHoverTerm: (term: string | undefined) => void;
}
