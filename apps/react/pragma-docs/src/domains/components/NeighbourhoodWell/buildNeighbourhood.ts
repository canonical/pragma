/**
 * The neighbourhood well's DETERMINISTIC layout — the "constrained
 * organics" policy (AV-364): meaning holds one axis, relaxation packs the
 * other. Pure — same input, byte-equal output — because positions must be
 * identical on server and client (the HierarchyWell precedent): the whole
 * settle runs INSIDE this function, so SSR ships pre-settled coordinates
 * and hydration has nothing to reconcile. No randomness anywhere.
 *
 * Layout model: the subject sits at the centre; each relation family owns
 * a compass sector (SECTORS — taxonomy north, variants east, composition
 * south, modifiers west), so a reader who has learned one well can read
 * every well. Within a sector, neighbours spread evenly across the span on
 * an ellipse (wider than tall — the well borrows the reading column's
 * horizontal room); crowded sectors stagger onto an outer ring. A bounded
 * relaxation pass then separates any boxes that still collide — organic
 * packing, deterministic by construction (fixed iteration count, stable
 * pair order, centre immobile).
 */

import {
  CENTRE_EXTRA_WIDTH,
  CENTRE_NODE_HEIGHT,
  COLLISION_GAP,
  EDGE_BOW,
  MAX_PER_RING,
  NODE_CHAR_WIDTH,
  NODE_HEIGHT,
  NODE_MAX_WIDTH,
  NODE_MIN_WIDTH,
  NODE_PADDING,
  OUTER_RING_FACTOR,
  RELAX_ITERATIONS,
  RING_RADIUS_X,
  RING_RADIUS_Y,
  SECTORS,
  WELL_PADDING,
} from "./constants.js";
import type {
  NeighbourhoodGraph,
  NeighbourhoodInput,
  WellEdge,
  WellNode,
} from "./types.js";

/** A node mid-layout: mutable position, frozen identity. */
interface WorkingNode extends Omit<WellNode, "x" | "y"> {
  x: number;
  y: number;
}

/**
 * Estimates a node's box from its label — never measures (see module doc).
 * The estimate errs generous so ellipsis is the exception, not the rule.
 */
export const estimateNodeWidth = (label: string, isCentre: boolean): number => {
  const raw = Math.round(label.length * NODE_CHAR_WIDTH) + NODE_PADDING;
  const clamped = Math.min(Math.max(raw, NODE_MIN_WIDTH), NODE_MAX_WIDTH);
  return isCentre ? clamped + CENTRE_EXTRA_WIDTH : clamped;
};

/**
 * The point where the segment from `towards` to `node`'s centre crosses
 * `node`'s box border (plus a small gap), so edges meet chips at their
 * edge instead of diving underneath them. Falls back to the node centre
 * for degenerate (zero-length) segments.
 */
export const edgeEndpoint = (
  node: WellNode,
  towards: { readonly x: number; readonly y: number },
  gap: number,
): { x: number; y: number } => {
  const dx = towards.x - node.x;
  const dy = towards.y - node.y;
  if (dx === 0 && dy === 0) return { x: node.x, y: node.y };
  const halfWidth = node.width / 2 + gap;
  const halfHeight = node.height / 2 + gap;
  // Slab test: the smallest positive t where the ray leaves the box.
  const tx = dx === 0 ? Number.POSITIVE_INFINITY : halfWidth / Math.abs(dx);
  const ty = dy === 0 ? Number.POSITIVE_INFINITY : halfHeight / Math.abs(dy);
  const t = Math.min(tx, ty, 1);
  return { x: node.x + dx * t, y: node.y + dy * t };
};

/** Round to a tenth of a px: keeps SSR output stable across engines. */
const settle = (value: number): number => Math.round(value * 10) / 10;

/**
 * One bounded relaxation pass over every unordered node pair: overlapping
 * boxes (plus breathing gap) push apart along the axis of least overlap,
 * half each; the centre never moves (index 0). Pair order and iteration
 * count are fixed, so the pass is deterministic.
 */
const relax = (nodes: WorkingNode[]): void => {
  for (let iteration = 0; iteration < RELAX_ITERATIONS; iteration += 1) {
    let moved = false;
    for (let a = 0; a < nodes.length; a += 1) {
      for (let b = a + 1; b < nodes.length; b += 1) {
        const nodeA = nodes.at(a);
        const nodeB = nodes.at(b);
        if (nodeA === undefined || nodeB === undefined) continue;
        const overlapX =
          (nodeA.width + nodeB.width) / 2 +
          COLLISION_GAP -
          Math.abs(nodeA.x - nodeB.x);
        const overlapY =
          (nodeA.height + nodeB.height) / 2 +
          COLLISION_GAP -
          Math.abs(nodeA.y - nodeB.y);
        if (overlapX <= 0 || overlapY <= 0) continue;
        moved = true;
        // Ties push horizontally: labels are wide, rows are shallow.
        if (overlapX <= overlapY) {
          const sign = nodeA.x <= nodeB.x ? -1 : 1;
          const shift = overlapX / 2;
          if (a === 0) {
            nodeB.x -= sign * overlapX;
          } else {
            nodeA.x += sign * shift;
            nodeB.x -= sign * shift;
          }
        } else {
          const sign = nodeA.y <= nodeB.y ? -1 : 1;
          const shift = overlapY / 2;
          if (a === 0) {
            nodeB.y -= sign * overlapY;
          } else {
            nodeA.y += sign * shift;
            nodeB.y -= sign * shift;
          }
        }
      }
    }
    if (!moved) break;
  }
};

/**
 * Builds the settled neighbourhood graph. Coordinates come out normalised
 * to a top-left origin with padding, ready for a 1:1 (unscaled) canvas —
 * the renderer positions HTML chips and draws SVG edges in the same px
 * space, which is what lets nodes stay real links under a plain edge
 * layer.
 */
export const buildNeighbourhood = (
  input: NeighbourhoodInput,
): NeighbourhoodGraph => {
  const centre: WorkingNode = {
    uri: input.centreUri,
    label: input.centreLabel,
    kind: "component",
    box: "instance",
    isCentre: true,
    x: 0,
    y: 0,
    width: estimateNodeWidth(input.centreLabel, true),
    height: CENTRE_NODE_HEIGHT,
  };
  const nodes: WorkingNode[] = [centre];

  // Sector placement: even angular spread, staggered rings when crowded.
  for (const sector of Object.keys(SECTORS) as (keyof typeof SECTORS)[]) {
    const members = input.neighbours.filter(
      (neighbour) => neighbour.spec.sector === sector,
    );
    const { centre: sectorCentre, span } = SECTORS[sector];
    for (const [index, neighbour] of members.entries()) {
      const step = span / Math.max(members.length, 1);
      const angle = sectorCentre - span / 2 + step / 2 + index * step;
      const staggered = members.length > MAX_PER_RING && index % 2 === 1;
      const factor = staggered ? OUTER_RING_FACTOR : 1;
      nodes.push({
        uri: neighbour.uri,
        label: neighbour.label,
        kind: neighbour.kind ?? neighbour.spec.kind,
        box: neighbour.spec.box,
        href: neighbour.href,
        sector,
        isCentre: false,
        x: Math.cos(angle) * RING_RADIUS_X * factor,
        y: Math.sin(angle) * RING_RADIUS_Y * factor,
        width: estimateNodeWidth(neighbour.label, false),
        height: NODE_HEIGHT,
      });
    }
  }

  relax(nodes);

  // Normalise to a padded top-left origin and settle the precision.
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const node of nodes) {
    minX = Math.min(minX, node.x - node.width / 2);
    minY = Math.min(minY, node.y - node.height / 2);
    maxX = Math.max(maxX, node.x + node.width / 2);
    maxY = Math.max(maxY, node.y + node.height / 2);
  }
  const settledNodes: WellNode[] = nodes.map((node) => ({
    ...node,
    x: settle(node.x - minX + WELL_PADDING),
    y: settle(node.y - minY + WELL_PADDING),
  }));

  const settledCentre = settledNodes.at(0);
  if (settledCentre === undefined) {
    throw new Error("NeighbourhoodWell: layout lost its centre node");
  }

  // Edges: every edge joins the centre to one neighbour. Structural edges
  // run straight; semantic edges bow off their chord and carry a label at
  // the bow's apex. The arrowhead follows the predicate's true direction.
  const nodeByUri = new Map(settledNodes.map((node) => [node.uri, node]));
  const edges: WellEdge[] = [];
  for (const neighbour of input.neighbours) {
    const target = nodeByUri.get(neighbour.uri);
    if (target === undefined) continue;
    const from = neighbour.spec.direction === "out" ? settledCentre : target;
    const to = neighbour.spec.direction === "out" ? target : settledCentre;
    const start = edgeEndpoint(from, to, 3);
    const end = edgeEndpoint(to, from, 7);
    if (neighbour.spec.family === "structural") {
      edges.push({
        id: `${neighbour.spec.key}:${neighbour.uri}`,
        neighbourUri: neighbour.uri,
        family: "structural",
        predicate: neighbour.spec.predicate,
        d: `M ${settle(start.x)} ${settle(start.y)} L ${settle(end.x)} ${settle(end.y)}`,
      });
      continue;
    }
    const middleX = (start.x + end.x) / 2;
    const middleY = (start.y + end.y) / 2;
    const chordX = end.x - start.x;
    const chordY = end.y - start.y;
    const length = Math.hypot(chordX, chordY) || 1;
    const controlX = middleX - (chordY / length) * EDGE_BOW;
    const controlY = middleY + (chordX / length) * EDGE_BOW;
    edges.push({
      id: `${neighbour.spec.key}:${neighbour.uri}`,
      neighbourUri: neighbour.uri,
      family: "semantic",
      predicate: neighbour.spec.predicate,
      d: `M ${settle(start.x)} ${settle(start.y)} Q ${settle(controlX)} ${settle(controlY)} ${settle(end.x)} ${settle(end.y)}`,
      // The label sits at the quadratic's apex (t = 0.5), lifted off the
      // stroke; the renderer haloes it so it stays legible over edges.
      labelAt: {
        x: settle((start.x + end.x + 2 * controlX) / 4),
        y: settle((start.y + end.y + 2 * controlY) / 4 - 6),
      },
    });
  }

  return {
    nodes: settledNodes,
    edges,
    width: settle(maxX - minX + WELL_PADDING * 2),
    height: settle(maxY - minY + WELL_PADDING * 2),
  };
};
