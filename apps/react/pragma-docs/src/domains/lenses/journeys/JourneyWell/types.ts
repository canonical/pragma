import type { Edge, Node } from "@xyflow/react";
import type { HTMLAttributes, ReactNode } from "react";

/**
 * The kind of hop a node stands for — the journey's columns, left to
 * right. Ordering IS the layout's x axis, so this tuple is the spine:
 * demand on the left, the surface that answers it on the right.
 *
 * `layout` sits last and is optional in the data sense: a pairing reaches
 * a layout only when the surface it pairs to composes one, and most do
 * not. The column exists so that absence is legible rather than trimmed
 * away — see `buildJourneyGraph` for why that matters.
 */
export const HOP_KINDS = [
  "coordinate",
  "job",
  "pairing",
  "surface",
  "layout",
] as const;

export type HopKind = (typeof HOP_KINDS)[number];

/**
 * One journey node's payload. Every member is READ OFF THE GRAPH — none
 * is derived by a rule the ontology does not state:
 *
 * - `role` is the pairing's own `pairingRole` URI (Primary / Secondary).
 *   It drives edge weight through a className, never a position.
 * - `arrival` is the pairing's own `arrival` URI (ColdEntry / SubjectKept
 *   / NoMove) — or undefined, which is DATA rather than a gap: 34 of 133
 *   pairings carry none, and pairings to ports carry none by rule (shape
 *   F7 — agents have no reorientation to preserve).
 * - `href` is the docsite route this surface actually lives at, when one
 *   exists; absent for every surface the site does not render.
 */
export interface JourneyNodeData extends Record<string, unknown> {
  /** The node's own graph URI — its identity and its address. */
  readonly uri: string;
  /** The display label: the graph's own label, never invented. */
  readonly label: string;
  /** Which column this node sits in. */
  readonly kind: HopKind;
  /** The concrete `Surface` implementor, for surface nodes only. */
  readonly surfaceType?: string | undefined;
  /** The pairing's role URI, for pairing nodes only. */
  readonly role?: string | undefined;
  /** The pairing's arrival URI, for pairing nodes only; may be absent. */
  readonly arrival?: string | undefined;
  /** The docsite route for this surface, when the site renders one. */
  readonly href?: string | undefined;
}

/** The well's node/edge shapes (React Flow's, narrowed to this graph). */
export type JourneyFlowNode = Node<JourneyNodeData, "hop">;
export type JourneyFlowEdge = Edge;

export interface JourneyWellProps extends HTMLAttributes<HTMLDivElement> {
  /** Content to render inside the component */
  children?: ReactNode;
}
