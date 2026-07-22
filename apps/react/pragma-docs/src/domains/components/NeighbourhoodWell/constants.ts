import type { Box, Kind } from "#lib/Chip/encodings.js";

/** Root CSS class name, `ds`-prefixed per the app-wide convention. */
export const WELL_CSS_CLASS_NAME = "ds neighbourhood-well";

/**
 * The two edge families of the well grammar (AV-364). STRUCTURAL edges are
 * the taxonomy's quiet skeleton — hairlines with hollow heads, unlabelled
 * (the legend carries their reading). SEMANTIC edges are named predicates —
 * accent arcs wearing their predicate as a halo'd mono label. The legend
 * generates from this table, so it cannot drift from the rendering.
 */
export const EDGE_FAMILIES = [
  {
    value: "structural",
    label: "Structural",
    description: "Taxonomy — what this is and where it sits (hollow head).",
  },
  {
    value: "semantic",
    label: "Semantic",
    description: "Named predicate — the arc wears the relation's name.",
  },
] as const;

export type EdgeFamily = (typeof EDGE_FAMILIES)[number]["value"];

/**
 * The compass sectors (an echo of AX.6's region compass at graph scale):
 * a relation family always appears on the same side of the subject, so a
 * reader who has seen one well can read every well. Angles are radians in
 * screen coordinates (y grows downward): −π/2 is north, 0 east, π/2 south,
 * π west. Each sector's span leaves a margin to its neighbours.
 */
export const SECTORS = {
  taxonomy: { centre: -Math.PI / 2, span: 1.8 },
  variants: { centre: 0, span: 1.1 },
  composition: { centre: Math.PI / 2, span: 1.8 },
  modifiers: { centre: Math.PI, span: 1.1 },
} as const;

export type Sector = keyof typeof SECTORS;

/**
 * One row per relation the well draws — the single source of truth for how
 * each Component field becomes nodes and edges. `direction` is the
 * predicate's true direction (`out` = subject → neighbour), which decides
 * where the arrowhead lands. `linkable` marks relations whose entities have
 * a live canonical home today (the interim D31 map, `resolveChipHref`);
 * everything else renders as an inert chip — never a dead link.
 */
export interface RelationSpec {
  readonly key:
    | "type"
    | "tier"
    | "inheritsFrom"
    | "specializedBy"
    | "variant"
    | "variantOf"
    | "modifierFamily"
    | "subcomponent";
  readonly predicate: string;
  readonly family: EdgeFamily;
  readonly sector: Sector;
  readonly direction: "out" | "in";
  readonly kind: Kind;
  readonly box: Box;
  readonly linkable: boolean;
}

export const RELATION_SPECS: readonly RelationSpec[] = [
  {
    key: "type",
    predicate: "rdf:type",
    family: "structural",
    sector: "taxonomy",
    direction: "out",
    kind: "term",
    box: "class",
    linkable: true,
  },
  {
    key: "tier",
    predicate: "ds:tier",
    family: "structural",
    sector: "taxonomy",
    direction: "out",
    kind: "concept",
    box: "instance",
    linkable: false,
  },
  {
    key: "inheritsFrom",
    predicate: "inherits from",
    family: "structural",
    sector: "taxonomy",
    direction: "out",
    kind: "component",
    box: "instance",
    linkable: true,
  },
  {
    key: "specializedBy",
    predicate: "specialised by",
    family: "structural",
    sector: "taxonomy",
    direction: "in",
    kind: "component",
    box: "instance",
    linkable: true,
  },
  {
    key: "variant",
    predicate: "variant",
    family: "semantic",
    sector: "variants",
    direction: "in",
    kind: "component",
    box: "instance",
    linkable: true,
  },
  {
    key: "variantOf",
    predicate: "variant of",
    family: "semantic",
    sector: "variants",
    direction: "out",
    kind: "component",
    box: "instance",
    linkable: true,
  },
  {
    key: "modifierFamily",
    predicate: "modifier family",
    family: "semantic",
    sector: "modifiers",
    direction: "out",
    kind: "concept",
    box: "instance",
    linkable: false,
  },
  {
    key: "subcomponent",
    predicate: "subcomponent",
    family: "semantic",
    sector: "composition",
    direction: "out",
    kind: "component",
    box: "instance",
    linkable: false,
  },
] as const;

/* ------------------------------------------------------------------ */
/* Geometry — every number the pure layout computes with.              */
/* ------------------------------------------------------------------ */

/**
 * Node metrics are ESTIMATED from label length (glyph width at the node
 * font size), never measured: the server has no text metrics, and the same
 * estimate on both sides is what keeps hydration byte-stable (the
 * HierarchyWell precedent, made content-proportional). A long label
 * ellipsises inside its estimated box; `title` keeps it recoverable.
 */
export const NODE_CHAR_WIDTH = 8;
export const NODE_PADDING = 40;
export const NODE_MIN_WIDTH = 64;
export const NODE_MAX_WIDTH = 236;
export const NODE_HEIGHT = 30;
export const CENTRE_NODE_HEIGHT = 36;
export const CENTRE_EXTRA_WIDTH = 14;

/** The ego ellipse: wider than tall, so the well uses the reading column's
 * horizontal room instead of overflowing it vertically. */
export const RING_RADIUS_X = 250;
export const RING_RADIUS_Y = 128;
/** Crowded sectors stagger onto a second ring at this factor. */
export const OUTER_RING_FACTOR = 1.45;
/** A sector splits across two rings past this many nodes. */
export const MAX_PER_RING = 4;

/** The relaxation pass: deterministic, order-stable, and bounded. */
export const RELAX_ITERATIONS = 64;
export const COLLISION_GAP = 12;

/** Breathing room around the settled graph's bounding box. */
export const WELL_PADDING = 28;

/** How far a semantic arc bows from its chord, in px. */
export const EDGE_BOW = 30;
