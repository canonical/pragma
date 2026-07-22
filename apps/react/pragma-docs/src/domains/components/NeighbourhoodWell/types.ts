import type { Box, Kind } from "#lib/Chip/encodings.js";
import type { NeighbourhoodWell_component$key } from "#relay/__generated__/NeighbourhoodWell_component.graphql.js";
import type { EdgeFamily, RelationSpec, Sector } from "./constants.js";

export interface NeighbourhoodWellProps {
  /** The entity page's fragment ref. */
  readonly component: NeighbourhoodWell_component$key;
  /** Additional CSS classes. */
  readonly className?: string;
}

/** One neighbour before layout: identity plus its relation's row. */
export interface NeighbourInput {
  readonly uri: string;
  readonly label: string;
  readonly spec: RelationSpec;
  /** The URI's own kind, when it asserts one — overrides the spec's. */
  readonly kind?: Kind;
  /** Landing href, when the relation is linkable and a home resolves. */
  readonly href?: string;
}

/** Everything the pure layout needs — extracted from fragment data. */
export interface NeighbourhoodInput {
  readonly centreUri: string;
  readonly centreLabel: string;
  readonly neighbours: readonly NeighbourInput[];
}

/** A settled node: a chip with a position and an estimated box. */
export interface WellNode {
  readonly uri: string;
  readonly label: string;
  readonly kind: Kind;
  readonly box: Box;
  readonly href?: string;
  readonly sector?: Sector;
  readonly isCentre: boolean;
  /** Box centre, in well coordinates (px, origin at top-left). */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A settled edge: a ready-to-render path with its grammar payload. */
export interface WellEdge {
  readonly id: string;
  /** URI of the non-centre endpoint (every edge touches the centre). */
  readonly neighbourUri: string;
  readonly family: EdgeFamily;
  readonly predicate: string;
  /** SVG path `d`, endpoints trimmed to the node boxes. */
  readonly d: string;
  /** Label anchor for semantic edges; structural edges carry none. */
  readonly labelAt?: { readonly x: number; readonly y: number };
}

/** The settled graph plus the canvas it needs. */
export interface NeighbourhoodGraph {
  readonly nodes: readonly WellNode[];
  readonly edges: readonly WellEdge[];
  readonly width: number;
  readonly height: number;
}
